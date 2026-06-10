import type { RegionCode } from "@shared/searchTypes";
import type { TrendSignal } from "@shared/intelligenceTypes";
import { ENV } from "../_core/env";
import { isSerpApiConfigured } from "../search/serpapi";
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
  if (!isSerpApiConfigured()) return null;

  const canUse = await canUseProviderToday("serpapi", ENV.serpApiDailyCap);
  if (!canUse) {
    console.warn("[Trends] SerpAPI daily cap reached");
    return null;
  }

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

function rowToSignal(row: typeof trendSignals.$inferSelect, isLive: boolean): TrendSignal {
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
    if (stale[0]) return rowToSignal(stale[0], false);
  }

  return null;
}

export async function ingestTrendKeywords(keywords: string[], region: RegionCode) {
  let count = 0;
  for (const keyword of keywords) {
    const canUse = await canUseProviderToday("serpapi", ENV.serpApiDailyCap);
    if (!canUse) break;
    const signal = await fetchGoogleTrendsLive(keyword, region);
    if (signal) {
      await saveTrendSignal(signal);
      count++;
    }
  }
  return count;
}
