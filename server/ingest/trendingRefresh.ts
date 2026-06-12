import type { RegionCode } from "@shared/searchTypes";

import { ENV } from "../_core/env";

import { upsertTrendingSnapshot } from "../db";

import { searchProductsLive } from "../search/liveSearch";

import { PRODUCT_CATEGORIES } from "@shared/searchTypes";
import { getCategorySeedQueries } from "../search/categories";

import { applyProductHuntFilters } from "../search/filters";

import { dedupeResults } from "../search/utils";

import { fuseProductTrendScores } from "./signalFusion";
import { enrichTrendingResults } from "../trending/rankReason";
import { mergeSearchResults } from "../dataPlatform/productGraph";
import { consumeIngestLiveSearch } from "./liveBudget";
import { searchCatalog } from "../dataPlatform/catalog";
import { inferCategoryFromTitle } from "../search/categories";
import { isSerperConfigured, searchAllSerperEndpoints } from "../search/serper";
import { canUseAnySerperKey } from "../search/serperPool";

const DEFAULT_TRENDING_QUERIES = [
  "wireless earbuds",
  "led lights",
  "phone accessories",
  "skincare serum",
  "pet feeder",
];

/** Build and persist one trending snapshot. Returns product count saved. */
export async function buildTrendingForRegion(
  region: RegionCode,
  category?: string
): Promise<number> {
  const filters = { region, category, sort: "trend_score" as const };

  const categorySeeds = category ? getCategorySeedQueries(category) : [];
  const queries =
    categorySeeds.length > 0
      ? categorySeeds.slice(0, ENV.ingestTrendingQueriesPerCategory)
      : category
        ? DEFAULT_TRENDING_QUERIES.slice(0, ENV.ingestTrendingQueriesPerCategory)
        : DEFAULT_TRENDING_QUERIES.slice(0, ENV.ingestTrendingQueriesDefault);

  const allResults: Awaited<ReturnType<typeof searchProductsLive>>["results"] = [];
  const sourcesSet = new Set<string>();

  for (const q of queries) {
    if (!consumeIngestLiveSearch()) break;

    try {
      const response = await searchProductsLive(q, "all", filters, { ingest: true });
      response.sources.forEach((s) => sourcesSet.add(s));
      allResults.push(
        ...response.results.map((p) => ({
          ...p,
          region: p.region ?? region,
        }))
      );
    } catch (err) {
      console.warn(`[Ingest] trending query failed ${q}:`, err);
    }
  }

  // Serper multi-endpoint supplement (shopping + web + images + news + places).
  if (allResults.length < 20 && isSerperConfigured() && (await canUseAnySerperKey())) {
    for (const q of queries.slice(0, 2)) {
      try {
        const serperHits = await searchAllSerperEndpoints(q, region);
        for (const p of serperHits) {
          if (category) {
            const inferred = inferCategoryFromTitle(p.title);
            if (inferred && inferred !== category) continue;
          }
          allResults.push({ ...p, region: p.region ?? region });
          if (p.sourceProvider) sourcesSet.add(p.sourceProvider);
        }
      } catch (err) {
        console.warn(`[Ingest] serper supplement failed ${q}:`, err);
      }
    }
  }

  // Supplement with cached catalog when live APIs are rate-limited or empty.
  if (allResults.length < 15) {
    for (const q of queries) {
      const catalogHits = await searchCatalog(q, region, 25);
      for (const p of catalogHits) {
        if (category) {
          const inferred = inferCategoryFromTitle(p.title);
          if (inferred && inferred !== category) continue;
        }
        allResults.push({ ...p, region: p.region ?? region });
        sourcesSet.add("catalog");
      }
    }
  }

  const merged = mergeSearchResults(dedupeResults(allResults));
  const deduped = applyProductHuntFilters(merged, filters);

  const fused = await fuseProductTrendScores(deduped, region, { forceTrending: true });

  const maxItems = category ? ENV.trendingMaxItemsCategory : ENV.trendingMaxItems;

  const results = enrichTrendingResults(
    fused
      .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
      .slice(0, maxItems)
  );

  if (results.length === 0) return 0;

  const expiresAt = new Date(Date.now() + ENV.trendingCacheTtlHours * 60 * 60 * 1000);

  await upsertTrendingSnapshot({
    region,
    category: category ?? null,
    payload: results,
    sources: Array.from(sourcesSet),
    isDemo: false,
    expiresAt,
  });

  return results.length;
}

/** @deprecated Use trending queue — kept for tests */
export async function refreshTrendingSnapshots(region: RegionCode) {
  await buildTrendingForRegion(region);
  for (const cat of PRODUCT_CATEGORIES.slice(0, ENV.ingestTrendingMaxCategories)) {
    await buildTrendingForRegion(region, cat);
  }
}
