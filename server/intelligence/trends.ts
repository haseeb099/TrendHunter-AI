import type { RegionCode } from "@shared/searchTypes";
import type { TrendSignal } from "@shared/intelligenceTypes";
import { ENV } from "../_core/env";
import { isSerpApiConfigured, isSerpConfigured } from "../search/serpapi";
import { isJustSerpConfigured, fetchGoogleTrendsJustSerp } from "../search/justserp";
import { desc, and, eq, gt } from "drizzle-orm";
import { trendSignals } from "../../drizzle/schema";
import { getDb } from "../db";
import { canUseProviderToday, incrementDailyApiUsage } from "../dataPlatform/apiUsage";

const REGION_GEO: Record<RegionCode, string> = {
  US: "US",
  UK: "GB",
  EU: "DE",
  GLOBAL: "",
};

function computeMomentum(points: Array<{ value: number }>): {
  score: number;
  label: "rising" | "stable" | "declining";
  changePercent90d: number | null;
} {
  if (points.length < 4) {
    return { score: 50, label: "stable", changePercent90d: null };
  }

  const recent = points.slice(-12);
  const older = points.slice(-24, -12);
  const avgRecent = recent.reduce((s, p) => s + p.value, 0) / recent.length;
  const avgOlder =
    older.length > 0 ? older.reduce((s, p) => s + p.value, 0) / older.length : avgRecent;

  const change =
    avgOlder > 0 ? Math.round(((avgRecent - avgOlder) / avgOlder) * 100) : 0;

  let label: "rising" | "stable" | "declining" = "stable";
  if (change >= 15) label = "rising";
  else if (change <= -15) label = "declining";

  const score = Math.min(100, Math.max(0, 50 + change));

  return { score, label, changePercent90d: change };
}

async function fetchGoogleTrendsLive(
  keyword: string,
  region: RegionCode
): Promise<TrendSignal | null> {
  if (!isSerpConfigured()) return null;

  if (isSerpApiConfigured()) {
    const canUse = await canUseProviderToday("serpapi", ENV.serpApiDailyCap);
    if (canUse) {
      const signal = await fetchGoogleTrendsSerpApi(keyword, region);
      if (signal) return signal;
    } else {
      console.warn("[Trends] SerpAPI daily cap reached");
    }
  }

  return fetchGoogleTrendsJustSerp(keyword, region);
}

async function fetchGoogleTrendsSerpApi(
  keyword: string,
  region: RegionCode
): Promise<TrendSignal | null> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("api_key", ENV.serpApiKey);
  url.searchParams.set("engine", "google_trends");
  url.searchParams.set("q", keyword);
  url.searchParams.set("data_type", "TIMESERIES");
  const geo = REGION_GEO[region];
  if (geo) url.searchParams.set("geo", geo);

  const response = await fetch(url);
  await incrementDailyApiUsage("serpapi");
  if (!response.ok) {
    console.warn("[Trends] SerpAPI failed:", response.status);
    return null;
  }

  const data = (await response.json()) as {
    interest_over_time?: {
      timeline_data?: Array<{
        date?: string;
        values?: Array<{ value?: number }>;
      }>;
    };
    related_queries?: {
      rising?: Array<{ query?: string }>;
      top?: Array<{ query?: string }>;
    };
  };

  const timeline = data.interest_over_time?.timeline_data ?? [];
  const interestOverTime = timeline.map((t) => ({
    date: t.date ?? "",
    value: t.values?.[0]?.value ?? 0,
  }));

  const risingQueries = (data.related_queries?.rising ?? [])
    .map((q) => q.query)
    .filter((q): q is string => Boolean(q))
    .slice(0, 10);

  const relatedQueries = (data.related_queries?.top ?? [])
    .map((q) => q.query)
    .filter((q): q is string => Boolean(q))
    .slice(0, 10);

  const { score, label, changePercent90d } = computeMomentum(interestOverTime);

  return {
    keyword,
    region,
    source: "google_trends",
    momentumScore: score,
    momentumLabel: label,
    changePercent90d,
    interestOverTime,
    relatedQueries,
    risingQueries,
    fetchedAt: new Date().toISOString(),
    isLive: true,
  };
}

export async function saveTrendSignal(signal: TrendSignal) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + ENV.trendingCacheTtlHours * 60 * 60 * 1000);

  await db.insert(trendSignals).values({
    keyword: signal.keyword.toLowerCase(),
    region: signal.region,
    source: signal.source,
    momentumScore: signal.momentumScore,
    momentumLabel: signal.momentumLabel,
    changePercent90d: signal.changePercent90d,
    interestOverTime: signal.interestOverTime,
    relatedQueries: signal.relatedQueries,
    risingQueries: signal.risingQueries,
    raw: null,
    expiresAt,
  });
}

function rowToSignal(
  row: typeof trendSignals.$inferSelect,
  isLive: boolean,
  stale = false
): TrendSignal {
  return {
    keyword: row.keyword,
    region: row.region as RegionCode,
    source: row.source as TrendSignal["source"],
    momentumScore: row.momentumScore,
    momentumLabel: (row.momentumLabel as TrendSignal["momentumLabel"]) ?? "stable",
    changePercent90d: row.changePercent90d,
    interestOverTime: (row.interestOverTime as TrendSignal["interestOverTime"]) ?? [],
    relatedQueries: (row.relatedQueries as string[]) ?? [],
    risingQueries: (row.risingQueries as string[]) ?? [],
    fetchedAt: row.fetchedAt.toISOString(),
    isLive,
    stale: stale || undefined,
  };
}

export async function getTrendSignal(
  keyword: string,
  region: RegionCode,
  options?: { live?: boolean }
): Promise<TrendSignal | null> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return null;

  const db = await getDb();
  const now = new Date();

  if (db) {
    const rows = await db
      .select()
      .from(trendSignals)
      .where(
        and(
          eq(trendSignals.keyword, kw),
          eq(trendSignals.region, region),
          gt(trendSignals.expiresAt, now)
        )
      )
      .orderBy(desc(trendSignals.fetchedAt))
      .limit(1);

    if (rows[0] && !options?.live) {
      return rowToSignal(rows[0], false);
    }

    if (rows[0] && options?.live === false) {
      return rowToSignal(rows[0], false);
    }
  }

  if (options?.live) {
    const live = await fetchGoogleTrendsLive(kw, region);
    if (live) {
      await saveTrendSignal(live);
      return live;
    }
  }

  if (db) {
    const stale = await db
      .select()
      .from(trendSignals)
      .where(and(eq(trendSignals.keyword, kw), eq(trendSignals.region, region)))
      .orderBy(desc(trendSignals.fetchedAt))
      .limit(1);
    if (stale[0]) return rowToSignal(stale[0], false, true);
  }

  return null;
}

/** Collect unique rising queries from recent trend signals for a region. */
export async function collectRisingQueriesForRegion(
  region: RegionCode,
  limit = 5
): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ risingQueries: trendSignals.risingQueries })
    .from(trendSignals)
    .where(eq(trendSignals.region, region))
    .orderBy(desc(trendSignals.fetchedAt))
    .limit(20);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const queries = (row.risingQueries as string[] | null) ?? [];
    for (const q of queries) {
      const normalized = q.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export async function ingestTrendKeywords(keywords: string[], region: RegionCode) {
  let count = 0;
  for (const keyword of keywords) {
    const serpCanUse =
      isSerpApiConfigured() &&
      (await canUseProviderToday("serpapi", ENV.serpApiDailyCap));
    const justSerpCanUse =
      isJustSerpConfigured() &&
      (await canUseProviderToday("justserp", ENV.justSerpDailyCap));
    if (!serpCanUse && !justSerpCanUse) break;

    const signal = await fetchGoogleTrendsLive(keyword, region);
    if (signal) {
      await saveTrendSignal(signal);
      count++;
    }
  }
  return count;
}
