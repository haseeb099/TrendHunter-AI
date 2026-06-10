import { and, desc, eq, gt } from "drizzle-orm";
import type { RegionCode } from "@shared/searchTypes";
import type { ProductCategory } from "@shared/searchTypes";
import type { MarketDigestItem } from "@shared/intelligenceTypes";
import { adLibrarySnapshots, trendSignals } from "../../drizzle/schema";
import { getDb } from "../db";
import { inferCategoryFromTitle } from "../search/categories";

function matchesCategory(keyword: string, category?: string | null): boolean {
  if (!category) return true;
  const inferred = inferCategoryFromTitle(keyword);
  return inferred === (category as ProductCategory);
}

export async function listTrendingKeywords(
  region: RegionCode,
  limit = 24,
  category?: string | null
): Promise<MarketDigestItem[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const fetchLimit = category ? Math.min(limit * 5, 100) : limit;
  const rows = await db
    .select()
    .from(trendSignals)
    .where(and(eq(trendSignals.region, region), gt(trendSignals.expiresAt, now)))
    .orderBy(desc(trendSignals.momentumScore))
    .limit(fetchLimit);

  return rows
    .map((row) => ({
      keyword: row.keyword,
      region: row.region as RegionCode,
      momentumScore: row.momentumScore,
      momentumLabel: (row.momentumLabel as MarketDigestItem["momentumLabel"]) ?? "stable",
      changePercent90d: row.changePercent90d,
      activeAdCount: null,
      advertiserCount: null,
      fetchedAt: row.fetchedAt.toISOString(),
      source: "google_trends" as const,
    }))
    .filter((item) => matchesCategory(item.keyword, category))
    .slice(0, limit);
}

export async function listAdRadarKeywords(
  region: RegionCode,
  limit = 24,
  category?: string | null
): Promise<MarketDigestItem[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const fetchLimit = category ? Math.min(limit * 5, 100) : limit;
  const rows = await db
    .select()
    .from(adLibrarySnapshots)
    .where(and(eq(adLibrarySnapshots.region, region), gt(adLibrarySnapshots.expiresAt, now)))
    .orderBy(desc(adLibrarySnapshots.activeAdCount))
    .limit(fetchLimit);

  return rows
    .map((row) => ({
      keyword: row.keyword,
      region: row.region as RegionCode,
      momentumScore: null,
      momentumLabel: null,
      changePercent90d: null,
      activeAdCount: row.activeAdCount,
      advertiserCount: row.advertiserCount,
      fetchedAt: row.fetchedAt.toISOString(),
      source: "meta_ads" as const,
    }))
    .filter((item) => matchesCategory(item.keyword, category))
    .slice(0, limit);
}

/** Merge trend + ad rows per keyword for the intel center overview */
export async function buildMarketDigest(
  region: RegionCode,
  category?: string | null
): Promise<{
  rising: MarketDigestItem[];
  metaHot: MarketDigestItem[];
  opportunities: MarketDigestItem[];
}> {
  const [trends, ads] = await Promise.all([
    listTrendingKeywords(region, 30, category),
    listAdRadarKeywords(region, 30, category),
  ]);

  const adByKeyword = new Map(ads.map((a) => [a.keyword.toLowerCase(), a]));

  const merged: MarketDigestItem[] = trends.map((t) => {
    const ad = adByKeyword.get(t.keyword.toLowerCase());
    return {
      ...t,
      activeAdCount: ad?.activeAdCount ?? null,
      advertiserCount: ad?.advertiserCount ?? null,
    };
  });

  const rising = merged
    .filter((m) => m.momentumLabel === "rising")
    .sort((a, b) => (b.momentumScore ?? 0) - (a.momentumScore ?? 0))
    .slice(0, 12);

  const metaHot = ads.slice(0, 12);

  const opportunities = merged
    .filter(
      (m) =>
        m.momentumLabel === "rising" &&
        (m.activeAdCount == null || m.activeAdCount < 15)
    )
    .slice(0, 8);

  return { rising, metaHot, opportunities };
}
