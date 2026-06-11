import type { ProductHuntFilters, ProductSearchResponse, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { getValidTrendingSnapshot, getStaleTrendingSnapshot } from "../db";
import { applyProductHuntFilters } from "../search/filters";
import { dedupeResults } from "../search/utils";
import { enrichTrendingResults } from "./rankReason";
import { scoreProducts } from "../ranking/scoreProduct";

async function applyTrendingFilters(
  results: ProductSearchResponse["results"],
  filters?: ProductHuntFilters,
  region?: RegionCode
) {
  const filtered = applyProductHuntFilters(dedupeResults(results), filters);
  const scored = await scoreProducts(filtered, region ?? (ENV.defaultRegion as RegionCode), {
    forceTrending: true,
  });
  return enrichTrendingResults(scored);
}

/** User-facing trending: DB only — never calls external APIs on page load */
export async function getTrendingFeed(options: {
  region?: RegionCode;
  category?: string;
  filters?: ProductHuntFilters;
}): Promise<ProductSearchResponse> {
  const region = options.region ?? (ENV.defaultRegion as RegionCode);
  const category = options.category ?? options.filters?.category;
  const filters: ProductHuntFilters = {
    ...options.filters,
    region: options.filters?.region ?? region,
    category,
  };

  const cached = await getValidTrendingSnapshot(region, category);
  if (cached) {
    return {
      results: await applyTrendingFilters(
        cached.payload as ProductSearchResponse["results"],
        filters,
        region
      ),
      sources: (cached.sources as ProductSearchResponse["sources"]) ?? [],
      isDemo: false,
      dataMode: "cached",
      cachedAt: cached.createdAt.toISOString(),
      creditsUsed: 0,
    };
  }

  const stale = await getStaleTrendingSnapshot(region, category);
  if (stale) {
    return {
      results: await applyTrendingFilters(
        stale.payload as ProductSearchResponse["results"],
        filters,
        region
      ),
      sources: (stale.sources as ProductSearchResponse["sources"]) ?? [],
      isDemo: false,
      dataMode: "cached",
      cachedAt: stale.createdAt.toISOString(),
      stale: true,
      warnings: ["Showing last cached trending data — daily refresh pending."],
      creditsUsed: 0,
    };
  }

  return {
    results: [],
    sources: [],
    isDemo: false,
    warnings: ["Trending data not available yet. Run `pnpm ingest:daily` to populate."],
    creditsUsed: 0,
  };
}
