import type { AdLibrarySnapshot, AdLibraryCreative } from "@shared/intelligenceTypes";
import type { IntelFetchOptions } from "@shared/intelFetch";
import { createLogger } from "../_core/logger";
import { ENV } from "../_core/env";
import { and, desc, eq, gt } from "drizzle-orm";
import { adLibrarySnapshots } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  assertProviderBudget,
  ProviderBudgetExhaustedError,
  recordProviderApiCall,
} from "../dataPlatform/providerBudget";
import { wrapProviderCall } from "../_core/providerHealth";

const log = createLogger("intel.ads");

const REGION_COUNTRY: Record<string, string> = {
  US: "US",
  UK: "GB",
  EU: "DE",
  GLOBAL: "US",
};

export function isMetaAdLibraryConfigured(): boolean {
  return Boolean(ENV.metaAccessToken);
}

export type MetaAdLibraryError = {
  code: number;
  type: string;
  message: string;
  tokenExpired?: boolean;
  permissionDenied?: boolean;
  userMessage?: string;
};

export function parseMetaApiError(body: string): MetaAdLibraryError | null {
  try {
    const parsed = JSON.parse(body) as {
      error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        error_user_msg?: string;
      };
    };
    if (!parsed.error?.message) return null;
    const message = parsed.error.message;
    const lower = message.toLowerCase();
    const tokenExpired =
      parsed.error.code === 190 ||
      lower.includes("session has expired") ||
      lower.includes("error validating access token");
    const permissionDenied =
      parsed.error.code === 10 ||
      parsed.error.error_subcode === 2332002 ||
      lower.includes("does not have permission") ||
      lower.includes("ads/library");
    return {
      code: parsed.error.code ?? 0,
      type: parsed.error.type ?? "OAuthException",
      message,
      userMessage: parsed.error.error_user_msg,
      tokenExpired,
      permissionDenied,
    };
  } catch {
    return null;
  }
}

async function fetchMetaAdsLive(
  keyword: string,
  region: string
): Promise<AdLibrarySnapshot | null> {
  if (!isMetaAdLibraryConfigured()) return null;

  try {
    await assertProviderBudget("meta_ads", { ingest: true });
  } catch (err) {
    if (err instanceof ProviderBudgetExhaustedError) {
      console.warn("[AdLibrary] Meta daily cap reached");
      return null;
    }
    throw err;
  }

  const country = REGION_COUNTRY[region] ?? "US";

  return wrapProviderCall("meta_ads", async () => {
    const url = new URL("https://graph.facebook.com/v21.0/ads_archive");
    url.searchParams.set("access_token", ENV.metaAccessToken);
    url.searchParams.set("search_terms", keyword);
    // Graph API array param — single-quoted country list per Meta docs
    url.searchParams.set("ad_reached_countries", `['${country}']`);
    url.searchParams.set("ad_type", "ALL");
    url.searchParams.set(
      "fields",
      "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,ad_snapshot_url,publisher_platforms"
    );
    url.searchParams.set("limit", "25");

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      const metaErr = parseMetaApiError(text);
      if (metaErr?.tokenExpired) {
        console.warn(
          "[AdLibrary] Meta access token expired — generate a new long-lived token in Meta Developer Console and update META_ACCESS_TOKEN"
        );
      } else if (metaErr?.permissionDenied) {
        console.warn(
          "[AdLibrary] Meta Ad Library access not authorized — complete identity verification at https://www.facebook.com/ads/library/api and ensure your app token has ads_read permission"
        );
        if (metaErr.userMessage) {
          console.warn("[AdLibrary]", metaErr.userMessage);
        }
      } else {
        console.warn("[AdLibrary] Meta API failed:", response.status, text.slice(0, 300));
      }
      throw new Error(metaErr?.message ?? `Meta API ${response.status}`);
    }

    await recordProviderApiCall("meta_ads");

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
  }).catch(() => null);
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
  options?: IntelFetchOptions
): Promise<AdLibrarySnapshot | null> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return null;

  const db = await getDb();
  const now = new Date();
  let cached: AdLibrarySnapshot | null = null;

  if (!options?.live && db) {
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

    if (rows[0]) cached = rowToSnapshot(rows[0]);
  }

  if (cached) return cached;

  if (options?.live || options?.warm) {
    const started = Date.now();
    try {
      const fetched = await fetchMetaAdsLive(kw, region);
      if (fetched) {
        await saveAdLibrarySnapshot(fetched);
        return fetched;
      }
      log.warn("fetch_empty", {
        provider: "meta_ads",
        keyword: kw,
        region,
        live: Boolean(options?.live),
        warm: Boolean(options?.warm),
        latencyMs: Date.now() - started,
      });
    } catch (err) {
      log.warn("fetch_failed", {
        provider: "meta_ads",
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
    try {
      await assertProviderBudget("meta_ads", { ingest: true });
    } catch (err) {
      if (err instanceof ProviderBudgetExhaustedError) break;
      throw err;
    }
    const snapshot = await fetchMetaAdsLive(keyword, region);
    if (snapshot) {
      await saveAdLibrarySnapshot(snapshot);
      count++;
    }
  }
  return count;
}
