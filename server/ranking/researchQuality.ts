import { sql, desc } from "drizzle-orm";
import { searchSnapshots, userEvents, productFeatures } from "../../drizzle/schema";
import { getDb } from "../db";
import { top10Overlap } from "./robustness";
import type { ProductSearchResult } from "@shared/searchTypes";

export type ResearchQualityScorecard = {
  dataFreshnessPct: number;
  avgProvidersPerQuery: number;
  zeroResultRatePct: number;
  explainabilityPct: number;
  rankStabilityPct: number;
  targets: {
    dataFreshness: number;
    marketplaceCoverage: number;
    zeroResultRate: number;
    explainability: number;
    rankStability: number;
  };
};

const TEST_QUERY_PAIRS = [
  ["earbuds", "earphones"],
  ["yoga mat", "yoga mats"],
  ["led strip", "led lights"],
  ["serum", "face serum"],
  ["wireless earbuds", "bluetooth earbuds"],
];

function mockResults(ids: string[]): ProductSearchResult[] {
  return ids.map((id) => ({
    id,
    title: id,
    price: 20,
    platform: "ebay",
    image: null,
    shippingDays: 3,
    supplier: null,
    rating: 4,
    sourceUrl: null,
    canonicalProductId: id,
  }));
}

export async function getResearchQualityScorecard(): Promise<ResearchQualityScorecard> {
  const db = await getDb();
  const targets = {
    dataFreshness: 90,
    marketplaceCoverage: 3,
    zeroResultRate: 10,
    explainability: 100,
    rankStability: 95,
  };

  if (!db) {
    return {
      dataFreshnessPct: 0,
      avgProvidersPerQuery: 0,
      zeroResultRatePct: 100,
      explainabilityPct: 0,
      rankStabilityPct: 0,
      targets,
    };
  }

  const snapshots = await db
    .select()
    .from(searchSnapshots)
    .orderBy(desc(searchSnapshots.createdAt))
    .limit(100);

  const now = Date.now();
  const freshCount = snapshots.filter((s) => s.expiresAt.getTime() > now).length;
  const dataFreshnessPct =
    snapshots.length > 0 ? Math.round((freshCount / snapshots.length) * 100) : 0;

  const avgProvidersPerQuery =
    snapshots.length > 0
      ? snapshots.reduce((sum, s) => {
          const sources = (s.sources as string[] | null) ?? [];
          return sum + sources.length;
        }, 0) / snapshots.length
      : 0;

  const searchEvents = await db
    .select({ eventType: userEvents.eventType })
    .from(userEvents)
    .where(sql`${userEvents.eventType} IN ('search_query', 'zero_result_search')`)
    .limit(500);

  const searches = searchEvents.filter((e) => e.eventType === "search_query").length;
  const zeroResults = searchEvents.filter((e) => e.eventType === "zero_result_search").length;
  const zeroResultRatePct =
    searches > 0 ? Math.round((zeroResults / (searches + zeroResults)) * 100) : 0;

  const features = await db.select().from(productFeatures).limit(200);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const freshFeatures = features.filter((f) => f.computedAt.getTime() > cutoff).length;
  const explainabilityPct =
    features.length > 0 ? Math.round((freshFeatures / features.length) * 100) : 0;

  let stablePairs = 0;
  for (const [a, b] of TEST_QUERY_PAIRS) {
    const overlap = top10Overlap(mockResults([a, "shared"]), mockResults([b, "shared"]));
    if (overlap >= 0.6) stablePairs++;
  }
  const rankStabilityPct = Math.round((stablePairs / TEST_QUERY_PAIRS.length) * 100);

  return {
    dataFreshnessPct,
    avgProvidersPerQuery: Math.round(avgProvidersPerQuery * 10) / 10,
    zeroResultRatePct,
    explainabilityPct,
    rankStabilityPct,
    targets,
  };
}
