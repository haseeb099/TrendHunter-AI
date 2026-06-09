import type { ProductSearchResponse, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { getValidTrendingSnapshot, upsertTrendingSnapshot } from "../db";
import { searchProducts } from "../search";
import { getTrendingMockProducts } from "../search/mock";
import { applyProductHuntFilters } from "../search/filters";
import { dedupeResults } from "../search/utils";

/** Category-aware trending seed queries */
const TRENDING_BY_CATEGORY: Record<string, string[]> = {
  electronics: ["wireless earbuds", "phone charger", "smart watch"],
  home: ["led strip lights", "kitchen organizer", "storage bins"],
  beauty: ["skincare serum", "face mask", "hair oil"],
  fashion: ["crossbody bag", "sneakers", "sunglasses"],
  sports: ["yoga mat", "resistance bands", "water bottle"],
  toys: ["building blocks", "plush toy", "puzzle game"],
  automotive: ["car phone mount", "dash cam", "seat organizer"],
  pet: ["pet feeder", "dog leash", "cat toy"],
};

const DEFAULT_TRENDING_QUERIES = [
  "wireless earbuds",
  "led lights",
  "phone accessories",
  "skincare serum",
  "pet feeder",
  "yoga mat",
  "kitchen gadget",
];

function queriesForCategory(category?: string): string[] {
  if (category && TRENDING_BY_CATEGORY[category]) {
    return TRENDING_BY_CATEGORY[category];
  }
  return DEFAULT_TRENDING_QUERIES;
}

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
    };
  }

  const filters = { region, category, sort: "trend_score" as const };
  const queries = queriesForCategory(category);
  const allResults: ProductSearchResponse["results"] = [];
  const sourcesSet = new Set<ProductSearchResponse["sources"][number]>();
  const warnings: string[] = [];

  const queryBatch = queries.slice(0, 4);
  const settled = await Promise.allSettled(
    queryBatch.map((q) => searchProducts(q, "all", filters))
  );

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      const response = outcome.value;
      response.sources.forEach((s) => sourcesSet.add(s));
      allResults.push(
        ...response.results.map((r) => ({
          ...r,
          isTrending: true,
          trendScore: Math.max(r.trendScore ?? 0, 65),
        }))
      );
      if (response.warnings) warnings.push(...response.warnings);
    }
  }

  let results = applyProductHuntFilters(dedupeResults(allResults), filters);
  let isDemo = sourcesSet.size === 0 || (sourcesSet.size === 1 && sourcesSet.has("mock"));

  if (results.length < 8) {
    const mockTrending = getTrendingMockProducts(region, category);
    results = applyProductHuntFilters(
      dedupeResults([...results, ...mockTrending]),
      filters
    );
    sourcesSet.add("mock");
    isDemo = isDemo || mockTrending.length > 0;
  }

  results = results
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
    .slice(0, ENV.trendingMaxItems);

  const sources = Array.from(sourcesSet);
  const expiresAt = new Date(Date.now() + ENV.trendingCacheTtlHours * 60 * 60 * 1000);

  await upsertTrendingSnapshot({
    region,
    category: category ?? null,
    payload: results,
    sources,
    isDemo,
    expiresAt,
  });

  return {
    results,
    sources,
    isDemo,
    warnings: warnings.length > 0 ? Array.from(new Set(warnings)) : undefined,
  };
}
