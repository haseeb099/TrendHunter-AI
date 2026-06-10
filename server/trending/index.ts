import type { ProductSearchResponse, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { getValidTrendingSnapshot, getStaleTrendingSnapshot } from "../db";
import { getTrendingMockProducts } from "../search/mock";
import { applyProductHuntFilters } from "../search/filters";
import { dedupeResults } from "../search/utils";

/** User-facing trending: DB only — never calls external APIs on page load */
export async function getTrendingFeed(options: {
  region?: RegionCode;
  category?: string;
}): Promise<ProductSearchResponse> {
  const region = options.region ?? (ENV.defaultRegion as RegionCode);
  const category = options.category;

  const cached = await getValidTrendingSnapshot(region, category);
  if (cached) {
    return {
      results: cached.payload as ProductSearchResponse["results"],
      sources: (cached.sources as ProductSearchResponse["sources"]) ?? ["mock"],
      isDemo: cached.isDemo,
      dataMode: "cached",
      cachedAt: cached.createdAt.toISOString(),
      creditsUsed: 0,
    };
  }

  const stale = await getStaleTrendingSnapshot(region, category);
  if (stale) {
    return {
      results: stale.payload as ProductSearchResponse["results"],
      sources: (stale.sources as ProductSearchResponse["sources"]) ?? ["mock"],
      isDemo: stale.isDemo,
      dataMode: "cached",
      cachedAt: stale.createdAt.toISOString(),
      stale: true,
      warnings: ["Showing last cached trending data — daily refresh pending."],
      creditsUsed: 0,
    };
  }

  const filters = { region, category, sort: "trend_score" as const };
  const mockTrending = getTrendingMockProducts(region, category);
  const results = applyProductHuntFilters(dedupeResults(mockTrending), filters).slice(
    0,
    ENV.trendingMaxItems
  );

  return {
    results,
    sources: ["mock"],
    isDemo: true,
    dataMode: "demo",
    warnings: ["Run daily ingest to populate trending — showing demo products."],
    creditsUsed: 0,
  };
}
