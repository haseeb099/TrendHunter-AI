import { and, desc, eq, gt } from "drizzle-orm";
import type { RegionCode } from "@shared/searchTypes";
import type { ProductCategory } from "@shared/searchTypes";
import type { MarketDigestItem } from "@shared/intelligenceTypes";
import { adLibrarySnapshots, tiktokAdsSnapshots, trendSignals } from "../../drizzle/schema";
import { getDb } from "../db";
import { inferCategoryFromTitle } from "../search/categories";
import { listTikTokAdKeywords } from "./tiktokAds";

const DIGEST_LIMIT = 12;

function matchesCategory(keyword: string, category?: string | null): boolean {
  if (!category) return true;
  const inferred = inferCategoryFromTitle(keyword);
  return inferred === (category as ProductCategory);
}

function dedupeByKeyword(items: MarketDigestItem[]): MarketDigestItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Prefer keywords not already shown in prior digest sections. */
function pickSectionItems(
  candidates: MarketDigestItem[],
  usedKeywords: Set<string>,
  limit: number
): MarketDigestItem[] {
  const unique = candidates.filter((item) => !usedKeywords.has(item.keyword.toLowerCase()));
  const picked = unique.slice(0, limit);
  if (picked.length >= limit || candidates.length === 0) {
    for (const item of picked) usedKeywords.add(item.keyword.toLowerCase());
    return picked;
  }

  // Sparse cache: allow overlap so sections still show source-specific metrics.
  const overlap = candidates
    .filter((item) => usedKeywords.has(item.keyword.toLowerCase()))
    .slice(0, limit - picked.length);
  const result = [...picked, ...overlap];
  for (const item of result) usedKeywords.add(item.keyword.toLowerCase());
  return result;
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

  let rows = await db
    .select()
    .from(trendSignals)
    .where(and(eq(trendSignals.region, region), gt(trendSignals.expiresAt, now)))
    .orderBy(desc(trendSignals.momentumScore))
    .limit(fetchLimit);

  if (rows.length === 0) {
    rows = await db
      .select()
      .from(trendSignals)
      .where(eq(trendSignals.region, region))
      .orderBy(desc(trendSignals.fetchedAt))
      .limit(fetchLimit);
  }

  return dedupeByKeyword(
    rows
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
        stale: row.expiresAt <= now,
      }))
      .filter((item) => matchesCategory(item.keyword, category))
      .slice(0, limit)
  );
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

  let rows = await db
    .select()
    .from(adLibrarySnapshots)
    .where(and(eq(adLibrarySnapshots.region, region), gt(adLibrarySnapshots.expiresAt, now)))
    .orderBy(desc(adLibrarySnapshots.activeAdCount))
    .limit(fetchLimit);

  if (rows.length === 0) {
    rows = await db
      .select()
      .from(adLibrarySnapshots)
      .where(eq(adLibrarySnapshots.region, region))
      .orderBy(desc(adLibrarySnapshots.fetchedAt))
      .limit(fetchLimit);
  }

  return dedupeByKeyword(
    rows
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
        stale: row.expiresAt <= now,
      }))
      .filter((item) => matchesCategory(item.keyword, category))
      .slice(0, limit)
  );
}

export async function listTikTokDigestKeywords(
  region: RegionCode,
  limit = 24,
  category?: string | null
): Promise<MarketDigestItem[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const fetchLimit = category ? Math.min(limit * 5, 100) : limit;

  let rows = await db
    .select()
    .from(tiktokAdsSnapshots)
    .where(and(eq(tiktokAdsSnapshots.region, region), gt(tiktokAdsSnapshots.expiresAt, now)))
    .orderBy(desc(tiktokAdsSnapshots.activeAdCount))
    .limit(fetchLimit);

  if (rows.length === 0) {
    rows = await db
      .select()
      .from(tiktokAdsSnapshots)
      .where(eq(tiktokAdsSnapshots.region, region))
      .orderBy(desc(tiktokAdsSnapshots.fetchedAt))
      .limit(fetchLimit);
  }

  return dedupeByKeyword(
    rows
      .map((row) => ({
        keyword: row.keyword,
        region: row.region as RegionCode,
        momentumScore: null,
        momentumLabel: null,
        changePercent90d: null,
        activeAdCount: row.activeAdCount,
        advertiserCount: row.advertiserCount,
        fetchedAt: row.fetchedAt.toISOString(),
        source: "tiktok" as const,
        stale: row.expiresAt <= now,
      }))
      .filter((item) => matchesCategory(item.keyword, category))
      .slice(0, limit)
  );
}

/** Merge trend + ad rows per keyword for opportunity scoring */
function mergeTrendAndAds(
  trends: MarketDigestItem[],
  ads: MarketDigestItem[]
): MarketDigestItem[] {
  const adByKeyword = new Map(ads.map((a) => [a.keyword.toLowerCase(), a]));
  return trends.map((t) => {
    const ad = adByKeyword.get(t.keyword.toLowerCase());
    return {
      ...t,
      activeAdCount: ad?.activeAdCount ?? null,
      advertiserCount: ad?.advertiserCount ?? null,
    };
  });
}

/** Merge digest lists for Intel Center — each section uses its own source ranking. */
export async function buildMarketDigest(
  region: RegionCode,
  category?: string | null
): Promise<{
  rising: MarketDigestItem[];
  metaHot: MarketDigestItem[];
  tiktokHot: MarketDigestItem[];
  opportunities: MarketDigestItem[];
}> {
  const [trends, ads, tiktok] = await Promise.all([
    listTrendingKeywords(region, 30, category),
    listAdRadarKeywords(region, 30, category),
    listTikTokDigestKeywords(region, 30, category),
  ]);

  const trendCandidates = dedupeByKeyword(
    trends
      .filter((t) => t.momentumScore != null)
      .sort((a, b) => (b.momentumScore ?? 0) - (a.momentumScore ?? 0))
  );

  const metaCandidates = dedupeByKeyword(
    ads
      .filter((a) => (a.activeAdCount ?? 0) > 0)
      .sort((a, b) => (b.activeAdCount ?? 0) - (a.activeAdCount ?? 0))
  );

  const tiktokCandidates = dedupeByKeyword(
    tiktok
      .filter((t) => (t.activeAdCount ?? 0) > 0)
      .sort((a, b) => (b.activeAdCount ?? 0) - (a.activeAdCount ?? 0))
  );

  const used = new Set<string>();

  const rising = pickSectionItems(
    trendCandidates.filter(
      (t) => t.momentumLabel === "rising" || (t.momentumScore ?? 0) >= 55
    ),
    used,
    DIGEST_LIMIT
  );

  const risingFallback =
    rising.length > 0 ? rising : pickSectionItems(trendCandidates, used, DIGEST_LIMIT);

  const metaHot = pickSectionItems(metaCandidates, used, DIGEST_LIMIT);
  const tiktokHot = pickSectionItems(tiktokCandidates, used, DIGEST_LIMIT);

  const merged = mergeTrendAndAds(trendCandidates, ads);
  const opportunities = merged
    .filter(
      (m) =>
        (m.momentumLabel === "rising" || (m.momentumScore ?? 0) >= 55) &&
        (m.activeAdCount == null || m.activeAdCount < 15)
    )
    .slice(0, 8);

  return {
    rising: risingFallback,
    metaHot,
    tiktokHot,
    opportunities:
      opportunities.length > 0 ? opportunities : risingFallback.slice(0, 8),
  };
}

export { listTikTokAdKeywords };
