import type {
  ProductHuntFilters,
  ProductSearchResponse,
  RegionCode,
  SearchPagination,
} from "@shared/searchTypes";
import type { TrendWindow } from "@shared/intelligenceTypes";
import { paginateResults } from "../search/pagination";
import { ENV } from "../_core/env";
import { getValidTrendingSnapshot, getStaleTrendingSnapshot } from "../db";
import { listCatalogByRegion } from "../dataPlatform/catalog";
import { applyProductHuntFilters } from "../search/filters";
import { dedupeResults } from "../search/utils";
import { enrichTrendingResults } from "./rankReason";
import { scoreProducts } from "../ranking/scoreProduct";
import { attachProductsTruthLabels } from "../search/truthLabels";
import { allowsHeuristicTrendScores } from "../truthMode";
import { REGION_FALLBACK_CHAIN, fallbackWarning, type SnapshotFallbackReason } from "./regionFallback";

const DISCOVER_MIN_PRODUCTS = 24;

async function enrichTrendingPayload(
  payload: ProductSearchResponse["results"],
  region: RegionCode,
  category?: string
): Promise<{ results: ProductSearchResponse["results"]; supplemented: boolean }> {
  if (payload.length >= DISCOVER_MIN_PRODUCTS) {
    return { results: payload, supplemented: false };
  }

  const catalog = await listCatalogByRegion(region, category, DISCOVER_MIN_PRODUCTS * 2);
  if (catalog.length === 0) {
    return { results: payload, supplemented: false };
  }

  const existing = new Set(payload.map((p) => `${p.platform}-${p.id}`));
  const extras = catalog.filter((p) => !existing.has(`${p.platform}-${p.id}`));
  if (extras.length === 0) {
    return { results: payload, supplemented: false };
  }

  return {
    results: dedupeResults([...payload, ...extras]),
    supplemented: true,
  };
}

async function applyTrendingFilters(
  results: ProductSearchResponse["results"],
  filters?: ProductHuntFilters,
  region?: RegionCode,
  timeframe?: TrendWindow,
  pagination?: SearchPagination
) {
  const filtered = applyProductHuntFilters(dedupeResults(results), filters);
  const sorted = [...filtered].sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0));
  const page = paginateResults(sorted, pagination);
  const allowHeuristic = await allowsHeuristicTrendScores();

  let items = page.items;
  try {
    items = await scoreProducts(items, region ?? (ENV.defaultRegion as RegionCode), {
      forceTrending: true,
      allowHeuristicScores: allowHeuristic,
      fetchLiveIntel: false,
      timeframe,
    });
  } catch (err) {
    console.warn("[trending] score_page_failed", err);
  }

  const enriched = enrichTrendingResults(items);
  const labeled = await attachProductsTruthLabels(enriched, { dataMode: "cached" });
  return {
    items: labeled,
    totalCount: page.totalCount,
    nextCursor: page.nextCursor,
  };
}

/** User-facing trending: DB only — never calls external APIs on page load */
export async function getTrendingFeed(options: {
  region?: RegionCode;
  category?: string;
  filters?: ProductHuntFilters;
  pagination?: SearchPagination;
  timeframe?: TrendWindow;
}): Promise<ProductSearchResponse> {
  const region = options.region ?? (ENV.defaultRegion as RegionCode);
  const category = options.category ?? options.filters?.category;
  const filters: ProductHuntFilters = {
    ...options.filters,
    region: options.filters?.region ?? region,
    category,
  };

  const paginate = async (
    payload: ProductSearchResponse["results"],
    sources: ProductSearchResponse["sources"],
    meta: Pick<ProductSearchResponse, "cachedAt" | "stale" | "warnings">
  ) => {
    const enriched = await enrichTrendingPayload(payload, region, category);
    const mergedSources = enriched.supplemented
      ? ([...sources, "catalog"] as ProductSearchResponse["sources"])
      : sources;
    const page = await applyTrendingFilters(
      enriched.results,
      filters,
      region,
      options.timeframe,
      options.pagination
    );
    return {
      results: page.items,
      totalCount: page.totalCount,
      nextCursor: page.nextCursor,
      sources: mergedSources,
      isDemo: false as const,
      dataMode: "cached" as const,
      creditsUsed: 0,
      warnings: enriched.supplemented
        ? [
            ...(meta.warnings ?? []),
            "Expanded with cached catalog products while trending ingest catches up.",
          ]
        : meta.warnings,
      cachedAt: meta.cachedAt,
      stale: meta.stale,
    };
  };

  async function resolveSnapshot(
    load: typeof getValidTrendingSnapshot
  ): Promise<{
    row: NonNullable<Awaited<ReturnType<typeof getValidTrendingSnapshot>>>;
    fallback: SnapshotFallbackReason;
  } | null> {
    let snap = await load(region, category);
    if (snap) return { row: snap, fallback: null };

    if (category) {
      snap = await load(region, undefined);
      if (snap) return { row: snap, fallback: "category_from_general" };
    }

    for (const fb of REGION_FALLBACK_CHAIN[region] ?? []) {
      snap = await load(fb, category);
      if (snap) return { row: snap, fallback: `region_${fb}` };
      if (category) {
        snap = await load(fb, undefined);
        if (snap) return { row: snap, fallback: `region_${fb}_general` };
      }
    }
    return null;
  }

  try {
    const cached = await resolveSnapshot(getValidTrendingSnapshot);
    if (cached) {
      const fbWarn = fallbackWarning(cached.fallback);
      return paginate(
        cached.row.payload as ProductSearchResponse["results"],
        (cached.row.sources as ProductSearchResponse["sources"]) ?? [],
        {
          cachedAt: cached.row.createdAt.toISOString(),
          warnings: fbWarn ? [fbWarn] : undefined,
        }
      );
    }

    const stale = await resolveSnapshot(getStaleTrendingSnapshot);
    if (stale) {
      const fbWarn = fallbackWarning(stale.fallback);
      return paginate(
        stale.row.payload as ProductSearchResponse["results"],
        (stale.row.sources as ProductSearchResponse["sources"]) ?? [],
        {
          cachedAt: stale.row.createdAt.toISOString(),
          stale: true,
          warnings: [
            "Showing last cached trending data — hourly ingest will refresh soon.",
            ...(fbWarn ? [fbWarn] : []),
          ],
        }
      );
    }
  } catch (err) {
    console.warn("[trending] snapshot_read_failed", err);
    return {
      results: [],
      sources: [],
      isDemo: false,
      totalCount: 0,
      warnings: ["Trending cache temporarily unavailable. Try again in a moment."],
      creditsUsed: 0,
    };
  }

  return {
    results: [],
    sources: [],
    isDemo: false,
    totalCount: 0,
    warnings: [
      "Trending data for this region/category is still ingesting. The hourly queue fills all regions and categories automatically — check back soon.",
    ],
    creditsUsed: 0,
  };
}
