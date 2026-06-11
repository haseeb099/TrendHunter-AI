import type { AdLibrarySnapshot, AdLibraryCreative } from "@shared/intelligenceTypes";
import { ENV } from "../_core/env";
import { and, desc, eq, gt } from "drizzle-orm";
import { adLibrarySnapshots } from "../../drizzle/schema";
import { getDb } from "../db";
import { canUseProviderToday, incrementDailyApiUsage } from "../dataPlatform/apiUsage";

const REGION_COUNTRY: Record<string, string> = {
  US: "US",
  UK: "GB",
  EU: "DE",
  GLOBAL: "US",
};

export function isMetaAdLibraryConfigured(): boolean {
  return Boolean(ENV.metaAccessToken);
}

async function fetchMetaAdsLive(
  keyword: string,
  region: string
): Promise<AdLibrarySnapshot | null> {
  if (!isMetaAdLibraryConfigured()) return null;

  const canUse = await canUseProviderToday("meta_ads", ENV.metaAdsDailyCap);
  if (!canUse) {
    console.warn("[AdLibrary] Meta daily cap reached");
    return null;
  }

  const country = REGION_COUNTRY[region] ?? "US";
  const url = new URL("https://graph.facebook.com/v21.0/ads_archive");
  url.searchParams.set("access_token", ENV.metaAccessToken);
  url.searchParams.set("search_terms", keyword);
  url.searchParams.set("ad_reached_countries", JSON.stringify([country]));
  url.searchParams.set("ad_type", "ALL");
  url.searchParams.set("fields", "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,ad_snapshot_url,publisher_platforms");
  url.searchParams.set("limit", "25");

  const response = await fetch(url);
  await incrementDailyApiUsage("meta_ads");

  if (!response.ok) {
    const text = await response.text();
    console.warn("[AdLibrary] Meta API failed:", response.status, text.slice(0, 200));
    return null;
  }

  const data = (await response.json()) as {
    data?: Array<{
      id?: string;
      page_name?: string;
      ad_creative_bodies?: string[];
      ad_creative_link_titles?: string[];
      ad_delivery_start_time?: string;
      ad_snapshot_url?: string;
      publisher_platforms?: string[];
    }>;
  };

  const ads = data.data ?? [];
  const advertisers = new Set(ads.map((a) => a.page_name).filter(Boolean));

  const creatives: AdLibraryCreative[] = ads.slice(0, 12).map((ad) => ({
    id: ad.id ?? crypto.randomUUID(),
    advertiserName: ad.page_name ?? "Unknown",
    bodyText: ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_titles?.[0] ?? null,
    ctaText: ad.ad_creative_link_titles?.[0] ?? null,
    platforms: ad.publisher_platforms ?? ["facebook"],
    startDate: ad.ad_delivery_start_time ?? null,
    isActive: true,
    snapshotUrl: ad.ad_snapshot_url ?? null,
  }));

  const gaps: string[] = [];
  if (ads.length === 0) {
    gaps.push("No active Meta ads found — low paid competition for this keyword");
  } else if (ads.length < 5) {
    gaps.push("Few advertisers — room to enter with differentiated creative");
  }
  if (creatives.every((c) => !c.bodyText?.toLowerCase().includes("ugc"))) {
    gaps.push("No UGC-style creatives detected — opportunity for authentic content");
  }

  return {
    keyword,
    region,
    activeAdCount: ads.length,
    advertiserCount: advertisers.size,
    creatives,
    gaps,
    fetchedAt: new Date().toISOString(),
    isLive: true,
  };
}

export async function saveAdLibrarySnapshot(snapshot: AdLibrarySnapshot) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + ENV.trendingCacheTtlHours * 60 * 60 * 1000);

  await db.insert(adLibrarySnapshots).values({
    keyword: snapshot.keyword.toLowerCase(),
    region: snapshot.region,
    activeAdCount: snapshot.activeAdCount,
    advertiserCount: snapshot.advertiserCount,
    creatives: snapshot.creatives,
    gaps: snapshot.gaps,
    raw: null,
    expiresAt,
  });
}

function rowToSnapshot(
  row: typeof adLibrarySnapshots.$inferSelect,
  stale = false
): AdLibrarySnapshot {
  return {
    keyword: row.keyword,
    region: row.region,
    activeAdCount: row.activeAdCount,
    advertiserCount: row.advertiserCount,
    creatives: row.creatives as AdLibraryCreative[],
    gaps: (row.gaps as string[]) ?? [],
    fetchedAt: row.fetchedAt.toISOString(),
    isLive: false,
    stale: stale || undefined,
  };
}

export async function getAdLibrarySnapshot(
  keyword: string,
  region: string,
  options?: { live?: boolean }
): Promise<AdLibrarySnapshot | null> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return null;

  const db = await getDb();
  const now = new Date();

  if (db && !options?.live) {
    const rows = await db
      .select()
      .from(adLibrarySnapshots)
      .where(
        and(
          eq(adLibrarySnapshots.keyword, kw),
          eq(adLibrarySnapshots.region, region),
          gt(adLibrarySnapshots.expiresAt, now)
        )
      )
      .orderBy(desc(adLibrarySnapshots.fetchedAt))
      .limit(1);

    if (rows[0]) return rowToSnapshot(rows[0]);
  }

  if (options?.live) {
    const live = await fetchMetaAdsLive(kw, region);
    if (live) {
      await saveAdLibrarySnapshot(live);
      return live;
    }
  }

  if (db) {
    const stale = await db
      .select()
      .from(adLibrarySnapshots)
      .where(and(eq(adLibrarySnapshots.keyword, kw), eq(adLibrarySnapshots.region, region)))
      .orderBy(desc(adLibrarySnapshots.fetchedAt))
      .limit(1);
    if (stale[0]) return rowToSnapshot(stale[0], true);
  }

  return null;
}

export async function ingestAdKeywords(keywords: string[], region: string) {
  let count = 0;
  for (const keyword of keywords) {
    const canUse = await canUseProviderToday("meta_ads", ENV.metaAdsDailyCap);
    if (!canUse) break;
    const snapshot = await fetchMetaAdsLive(keyword, region);
    if (snapshot) {
      await saveAdLibrarySnapshot(snapshot);
      count++;
    }
  }
  return count;
}
