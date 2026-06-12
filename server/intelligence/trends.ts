import type { RegionCode } from "@shared/searchTypes";
import type { TrendSignal, TrendWindow } from "@shared/intelligenceTypes";
import { ENV } from "../_core/env";
import { isSerpApiConfigured, isSerpConfigured } from "../search/serpapi";
import { isJustSerpConfigured, fetchGoogleTrendsJustSerp } from "../search/justserp";
import { isSerperConfigured, getSerperRelatedQueries, searchNewsSerper } from "../search/serper";
import { canUseAnySerperKey } from "../search/serperPool";
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

const WINDOW_PERIODS: Record<TrendWindow, number> = {
  "7d": 1,
  "30d": 4,
  "90d": 12,
};

export type MomentumResult = {
  score: number;
  label: "rising" | "stable" | "declining";
  changePercent: number | null;
};

export function computeMomentum(
  points: Array<{ value: number }>,
  window: TrendWindow = "90d"
): MomentumResult {
  const period = WINDOW_PERIODS[window];
  if (points.length < period + 1) {
    return { score: 50, label: "stable", changePercent: null };
  }

  const recent = points.slice(-period);
  const older = points.slice(-period * 2, -period);
  const avgRecent = recent.reduce((s, p) => s + p.value, 0) / recent.length;
  const avgOlder =
    older.length > 0 ? older.reduce((s, p) => s + p.value, 0) / older.length : avgRecent;

  const change =
    avgOlder > 0 ? Math.round(((avgRecent - avgOlder) / avgOlder) * 100) : 0;

  let label: "rising" | "stable" | "declining" = "stable";
  if (change >= 15) label = "rising";
  else if (change <= -15) label = "declining";

  const score = Math.min(100, Math.max(0, 50 + change));

  return { score, label, changePercent: change };
}

function computeAllWindowChanges(points: Array<{ value: number }>) {
  const w7 = computeMomentum(points, "7d");
  const w30 = computeMomentum(points, "30d");
  const w90 = computeMomentum(points, "90d");
  return {
    changePercent7d: w7.changePercent,
    changePercent30d: w30.changePercent,
    changePercent90d: w90.changePercent,
  };
}

export function applyTrendWindow(signal: TrendSignal, window: TrendWindow): TrendSignal {
  const w7 = computeMomentum(signal.interestOverTime, "7d");
  const w30 = computeMomentum(signal.interestOverTime, "30d");
  const w90 = computeMomentum(signal.interestOverTime, "90d");
  const active = window === "7d" ? w7 : window === "30d" ? w30 : w90;

  return {
    ...signal,
    momentumScore: active.score,
    momentumLabel: active.label,
    changePercent7d: signal.changePercent7d ?? w7.changePercent,
    changePercent30d: signal.changePercent30d ?? w30.changePercent,
    changePercent90d: signal.changePercent90d ?? w90.changePercent,
  };
}

async function fetchGoogleTrendsLive(
  keyword: string,
  region: RegionCode
): Promise<TrendSignal | null> {
  if (!isSerpConfigured() && !isSerperConfigured()) return null;

  if (isSerpApiConfigured()) {
    const canUse = await canUseProviderToday("serpapi", ENV.serpApiDailyCap);
    if (canUse) {
      const signal = await fetchGoogleTrendsSerpApi(keyword, region);
      if (signal) return signal;
    } else {
      console.warn("[Trends] SerpAPI daily cap reached");
    }
  }

  const justSerp = await fetchGoogleTrendsJustSerp(keyword, region);
  if (justSerp) return justSerp;

  return fetchSerperTrendProxy(keyword, region);
}

/** Lightweight trend proxy when Google Trends APIs unavailable — uses Serper news + related queries. */
async function fetchSerperTrendProxy(
  keyword: string,
  region: RegionCode
): Promise<TrendSignal | null> {
  if (!isSerperConfigured() || !(await canUseAnySerperKey())) return null;

  try {
    const [related, news] = await Promise.all([
      getSerperRelatedQueries(keyword, region, 10),
      searchNewsSerper(keyword, region, { maxResults: 8 }),
    ]);

    const newsCount = news.length;
    const momentumScore = Math.min(95, 35 + newsCount * 8 + related.length * 2);
    const momentumLabel: TrendSignal["momentumLabel"] =
      momentumScore >= 65 ? "rising" : momentumScore <= 40 ? "declining" : "stable";

    return {
      keyword,
      region,
      source: "serper",
      momentumScore,
      momentumLabel,
      changePercent7d: null,
      changePercent30d: null,
      changePercent90d: null,
      interestOverTime: [],
      relatedQueries: related.slice(0, 10),
      risingQueries: related.slice(0, 5),
      fetchedAt: new Date().toISOString(),
      isLive: true,
    };
  } catch (err) {
    console.warn("[Trends] Serper proxy failed:", err);
    return null;
  }
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

  const changes = computeAllWindowChanges(interestOverTime);
  const { score, label } = computeMomentum(interestOverTime, "90d");

  return {
    keyword,
    region,
    source: "google_trends",
    momentumScore: score,
    momentumLabel: label,
    ...changes,
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
  const interestOverTime = (row.interestOverTime as TrendSignal["interestOverTime"]) ?? [];
  const changes = computeAllWindowChanges(interestOverTime);

  return {
    keyword: row.keyword,
    region: row.region as RegionCode,
    source: row.source as TrendSignal["source"],
    momentumScore: row.momentumScore,
    momentumLabel: (row.momentumLabel as TrendSignal["momentumLabel"]) ?? "stable",
    changePercent7d: changes.changePercent7d,
    changePercent30d: changes.changePercent30d,
    changePercent90d: row.changePercent90d ?? changes.changePercent90d,
    interestOverTime,
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
  options?: { live?: boolean; timeframe?: TrendWindow }
): Promise<TrendSignal | null> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return null;

  const db = await getDb();
  const now = new Date();
  let signal: TrendSignal | null = null;

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
      signal = rowToSignal(rows[0], false);
    }

    if (rows[0] && options?.live === false) {
      signal = rowToSignal(rows[0], false);
    }
  }

  if (!signal && options?.live) {
    const live = await fetchGoogleTrendsLive(kw, region);
    if (live) {
      await saveTrendSignal(live);
      signal = live;
    }
  }

  if (!signal && db) {
    const stale = await db
      .select()
      .from(trendSignals)
      .where(and(eq(trendSignals.keyword, kw), eq(trendSignals.region, region)))
      .orderBy(desc(trendSignals.fetchedAt))
      .limit(1);
    if (stale[0]) signal = rowToSignal(stale[0], false, true);
  }

  if (!signal) return null;

  const timeframe = options?.timeframe ?? "90d";
  return applyTrendWindow(signal, timeframe);
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
    const serperCanUse = isSerperConfigured() && (await canUseAnySerperKey());
    if (!serpCanUse && !justSerpCanUse && !serperCanUse) break;

    const signal = await fetchGoogleTrendsLive(keyword, region);
    if (signal) {
      await saveTrendSignal(signal);
      count++;
    }
  }
  return count;
}
