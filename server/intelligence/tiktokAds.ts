import type { TikTokAdCreative, TikTokAdsSnapshot } from "@shared/intelligenceTypes";
import type { IntelFetchOptions } from "@shared/intelFetch";
import { createLogger } from "../_core/logger";
import { ENV } from "../_core/env";
import { and, desc, eq, gt } from "drizzle-orm";
import { tiktokAdsSnapshots } from "../../drizzle/schema";
import { getDb } from "../db";
import { canUseProviderToday, incrementDailyApiUsage } from "../dataPlatform/apiUsage";
import {
  isRapidTikTokApiConfigured,
  searchTikTokVideosByKeyword,
  type TikTokApi23Video,
} from "../search/rapidApi/tiktokApi23";

const log = createLogger("intel.tiktok");

const REGION_COUNTRY: Record<string, string> = {
  US: "US",
  UK: "GB",
  EU: "DE",
  GLOBAL: "all",
};

export function isTikTokAdsConfigured(): boolean {
  return (
    Boolean(ENV.searchApiKey) ||
    Boolean(ENV.tiktokShopApiKey) ||
    isRapidTikTokApiConfigured()
  );
}

export function tikTokAdsProvider(): "searchapi" | "scrapecreators" | "rapidapi_tiktok" | null {
  if (ENV.searchApiKey) return "searchapi";
  if (isRapidTikTokApiConfigured()) return "rapidapi_tiktok";
  if (ENV.tiktokShopApiKey) return "scrapecreators";
  return null;
}

async function fetchSearchApiTikTokAds(
  keyword: string,
  region: string
): Promise<TikTokAdsSnapshot | null> {
  if (!ENV.searchApiKey) return null;

  const canUse = await canUseProviderToday("tiktok_ads", ENV.tiktokAdsDailyCap);
  if (!canUse) {
    console.warn("[TikTokAds] daily cap reached");
    return null;
  }

  const country = REGION_COUNTRY[region] ?? "all";
  const url = new URL("https://www.searchapi.io/api/v1/search");
  url.searchParams.set("engine", "tiktok_ads_library");
  url.searchParams.set("q", keyword);
  url.searchParams.set("country", country);
  url.searchParams.set("api_key", ENV.searchApiKey);

  const response = await fetch(url);
  await incrementDailyApiUsage("tiktok_ads");

  if (!response.ok) {
    const text = await response.text();
    console.warn("[TikTokAds] SearchAPI failed:", response.status, text.slice(0, 200));
    return null;
  }

  const data = (await response.json()) as {
    ads?: Array<Record<string, unknown>>;
  };

  const ads = data.ads ?? [];
  const advertisers = new Set<string>();

  const creatives: TikTokAdCreative[] = ads.slice(0, 15).map((ad, index) => {
    const advertiser =
      String(ad.advertiser ?? ad.advertiser_name ?? ad.page_name ?? "Unknown").trim() || "Unknown";
    advertisers.add(advertiser);
    const videoUrl =
      (ad.video_link as string | undefined) ??
      (ad.video_url as string | undefined) ??
      (ad.videoUrl as string | undefined) ??
      null;
    const coverUrl =
      (ad.cover_image as string | undefined) ??
      (ad.cover_url as string | undefined) ??
      (ad.thumbnail as string | undefined) ??
      null;

    return {
      id: String(ad.id ?? `tt-ad-${index}`),
      advertiserName: advertiser,
      bodyText:
        (ad.ad_text as string | undefined) ??
        (ad.text as string | undefined) ??
        (ad.description as string | undefined) ??
        null,
      videoUrl,
      coverUrl,
      firstShown:
        (ad.first_shown_datetime as string | undefined) ??
        (ad.first_shown as string | undefined) ??
        null,
      lastShown:
        (ad.last_shown_datetime as string | undefined) ??
        (ad.last_shown as string | undefined) ??
        null,
      isActive: true,
    };
  });

  const gaps: string[] = [];
  if (ads.length === 0) {
    gaps.push("No TikTok ads found — low paid competition on this keyword");
  } else if (ads.length < 5) {
    gaps.push("Few TikTok advertisers — room to test UGC-style creatives");
  }
  if (creatives.every((c) => !c.bodyText?.toLowerCase().includes("shop"))) {
    gaps.push("No direct shop CTAs detected — test product demo hooks");
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
    source: "searchapi",
  };
}

async function fetchScrapeCreatorsTikTokContent(
  keyword: string,
  region: string
): Promise<TikTokAdsSnapshot | null> {
  if (!ENV.tiktokShopApiKey) return null;

  const canUse = await canUseProviderToday("tiktok_ads", ENV.tiktokAdsDailyCap);
  if (!canUse) return null;

  const base =
    ENV.tiktokShopApiBase?.trim().replace(/\/shop\/search.*$/, "") ||
    "https://api.scrapecreators.com/v1/tiktok";
  const url = new URL(`${base.replace(/\/$/, "")}/search/keyword`);
  url.searchParams.set("query", keyword);
  url.searchParams.set("amount", "20");

  const response = await fetch(url, {
    headers: {
      "x-api-key": ENV.tiktokShopApiKey,
      accept: "application/json",
    },
  });
  await incrementDailyApiUsage("tiktok_ads");

  if (!response.ok) {
    const text = await response.text();
    console.warn("[TikTokAds] ScrapeCreators failed:", response.status, text.slice(0, 200));
    return null;
  }

  const data = (await response.json()) as {
    videos?: Array<Record<string, unknown>>;
    data?: Array<Record<string, unknown>>;
    results?: Array<Record<string, unknown>>;
  };

  const items = data.videos ?? data.data ?? data.results ?? [];
  const advertisers = new Set<string>();

  const creatives: TikTokAdCreative[] = items.slice(0, 12).map((item, index) => {
    const author =
      String(
        item.author ??
          item.username ??
          item.nickname ??
          (item.author as { unique_id?: string } | undefined)?.unique_id ??
          "Creator"
      ).trim() || "Creator";
    advertisers.add(author);

    const desc = String(item.desc ?? item.description ?? item.title ?? "").trim() || null;
    const videoUrl =
      (item.video_url as string | undefined) ??
      (item.play_url as string | undefined) ??
      (item.share_url as string | undefined) ??
      null;
    const coverUrl =
      (item.cover as string | undefined) ??
      (item.thumbnail as string | undefined) ??
      (item.cover_url as string | undefined) ??
      null;

    return {
      id: String(item.id ?? item.aweme_id ?? `tt-content-${index}`),
      advertiserName: author,
      bodyText: desc,
      videoUrl,
      coverUrl,
      firstShown: null,
      lastShown: null,
      isActive: true,
    };
  });

  const gaps: string[] = [];
  if (items.length === 0) {
    gaps.push("No viral TikTok content found for this keyword yet");
  } else {
    gaps.push("Organic TikTok content (not paid ads) — use for hook and format inspiration");
  }

  return {
    keyword,
    region,
    activeAdCount: items.length,
    advertiserCount: advertisers.size,
    creatives,
    gaps,
    fetchedAt: new Date().toISOString(),
    isLive: true,
    source: "scrapecreators",
  };
}

function mapRapidApiVideosToCreatives(videos: TikTokApi23Video[]): {
  creatives: TikTokAdCreative[];
  advertisers: Set<string>;
} {
  const advertisers = new Set<string>();
  const creatives: TikTokAdCreative[] = videos.slice(0, 15).map((item, index) => {
    advertisers.add(item.author);
    return {
      id: item.id || `tt-rapid-${index}`,
      advertiserName: item.author,
      bodyText: item.desc,
      videoUrl: item.shareUrl,
      coverUrl: item.coverUrl,
      firstShown: item.createTime ? new Date(item.createTime * 1000).toISOString() : null,
      lastShown: null,
      isActive: true,
    };
  });
  return { creatives, advertisers };
}

async function fetchRapidApiTikTokSearch(
  keyword: string,
  region: string
): Promise<TikTokAdsSnapshot | null> {
  if (!isRapidTikTokApiConfigured()) return null;

  const videos = await searchTikTokVideosByKeyword(keyword, {
    count: ENV.rapidApiTiktokApiMaxItems,
  });
  if (videos.length === 0) return null;

  const { creatives, advertisers } = mapRapidApiVideosToCreatives(videos);
  const gaps: string[] = [];
  if (videos.length === 0) {
    gaps.push("No TikTok videos found for this keyword yet");
  } else {
    gaps.push("Organic TikTok search via RapidAPI (Tikfly) — hook and format inspiration");
  }
  if (videos.every((v) => (v.playCount ?? 0) < 10_000)) {
    gaps.push("Low view counts — niche may be early or underserved");
  }

  return {
    keyword,
    region,
    activeAdCount: videos.length,
    advertiserCount: advertisers.size,
    creatives,
    gaps,
    fetchedAt: new Date().toISOString(),
    isLive: true,
    source: "rapidapi_tiktok",
  };
}

async function fetchTikTokAdsLive(
  keyword: string,
  region: string
): Promise<TikTokAdsSnapshot | null> {
  if (ENV.searchApiKey) {
    const fromSearchApi = await fetchSearchApiTikTokAds(keyword, region);
    if (fromSearchApi) return fromSearchApi;
  }
  if (isRapidTikTokApiConfigured()) {
    const fromRapid = await fetchRapidApiTikTokSearch(keyword, region);
    if (fromRapid) return fromRapid;
  }
  if (ENV.tiktokShopApiKey) {
    const fromScrapeCreators = await fetchScrapeCreatorsTikTokContent(keyword, region);
    if (fromScrapeCreators) return fromScrapeCreators;
  }
  return null;
}

export async function saveTikTokAdsSnapshot(snapshot: TikTokAdsSnapshot) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + ENV.trendingCacheTtlHours * 60 * 60 * 1000);

  await db.insert(tiktokAdsSnapshots).values({
    keyword: snapshot.keyword.toLowerCase(),
    region: snapshot.region,
    activeAdCount: snapshot.activeAdCount,
    advertiserCount: snapshot.advertiserCount,
    creatives: snapshot.creatives,
    gaps: snapshot.gaps,
    source: snapshot.source,
    raw: null,
    expiresAt,
  });
}

function rowToSnapshot(
  row: typeof tiktokAdsSnapshots.$inferSelect,
  stale = false
): TikTokAdsSnapshot {
  return {
    keyword: row.keyword,
    region: row.region,
    activeAdCount: row.activeAdCount,
    advertiserCount: row.advertiserCount,
    creatives: row.creatives as TikTokAdCreative[],
    gaps: (row.gaps as string[]) ?? [],
    fetchedAt: row.fetchedAt.toISOString(),
    isLive: false,
    source: (row.source as TikTokAdsSnapshot["source"]) ?? "cached",
    stale: stale || undefined,
  };
}

export async function getTikTokAdsSnapshot(
  keyword: string,
  region: string,
  options?: IntelFetchOptions
): Promise<TikTokAdsSnapshot | null> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return null;

  const db = await getDb();
  const now = new Date();
  let cached: TikTokAdsSnapshot | null = null;

  if (!options?.live && db) {
    const rows = await db
      .select()
      .from(tiktokAdsSnapshots)
      .where(
        and(
          eq(tiktokAdsSnapshots.keyword, kw),
          eq(tiktokAdsSnapshots.region, region),
          gt(tiktokAdsSnapshots.expiresAt, now)
        )
      )
      .orderBy(desc(tiktokAdsSnapshots.fetchedAt))
      .limit(1);

    if (rows[0]) cached = rowToSnapshot(rows[0]);
  }

  if (cached) return cached;

  if (options?.live || options?.warm) {
    const started = Date.now();
    try {
      const fetched = await fetchTikTokAdsLive(kw, region);
      if (fetched) {
        await saveTikTokAdsSnapshot(fetched);
        return fetched;
      }
      log.warn("fetch_empty", {
        provider: "tiktok_ads",
        keyword: kw,
        region,
        live: Boolean(options?.live),
        warm: Boolean(options?.warm),
        latencyMs: Date.now() - started,
      });
    } catch (err) {
      log.warn("fetch_failed", {
        provider: "tiktok_ads",
        keyword: kw,
        region,
        live: Boolean(options?.live),
        warm: Boolean(options?.warm),
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (db) {
    const stale = await db
      .select()
      .from(tiktokAdsSnapshots)
      .where(and(eq(tiktokAdsSnapshots.keyword, kw), eq(tiktokAdsSnapshots.region, region)))
      .orderBy(desc(tiktokAdsSnapshots.fetchedAt))
      .limit(1);
    if (stale[0]) return rowToSnapshot(stale[0], true);
  }

  return null;
}

export async function ingestTikTokAdKeywords(keywords: string[], region: string) {
  let count = 0;
  for (const keyword of keywords) {
    const provider = tikTokAdsProvider();
    if (!provider) break;

    if (provider === "searchapi" || provider === "scrapecreators") {
      const canUse = await canUseProviderToday("tiktok_ads", ENV.tiktokAdsDailyCap);
      if (!canUse) break;
    }

    const snapshot = await fetchTikTokAdsLive(keyword, region);
    if (snapshot) {
      await saveTikTokAdsSnapshot(snapshot);
      count++;
    }
  }
  return count;
}

export async function listTikTokAdKeywords(region: string, limit = 24) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const rows = await db
    .select()
    .from(tiktokAdsSnapshots)
    .where(and(eq(tiktokAdsSnapshots.region, region), gt(tiktokAdsSnapshots.expiresAt, now)))
    .orderBy(desc(tiktokAdsSnapshots.activeAdCount))
    .limit(limit);

  return rows.map((row) => ({
    keyword: row.keyword,
    region: row.region,
    activeAdCount: row.activeAdCount,
    advertiserCount: row.advertiserCount,
    source: row.source,
    fetchedAt: row.fetchedAt.toISOString(),
  }));
}
