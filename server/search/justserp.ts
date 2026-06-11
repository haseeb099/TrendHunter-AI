import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import type { TrendSignal } from "@shared/intelligenceTypes";
import { ENV } from "../_core/env";
import { resolveRegion } from "./regions";
import { canUseProviderToday, incrementDailyApiUsage } from "../dataPlatform/apiUsage";

const BASE_URL = "https://api.justserpapi.com";

export function isJustSerpConfigured() {
  return Boolean(ENV.justSerpApiKey);
}

type JustSerpEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

async function justSerpFetch<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { "X-API-Key": ENV.justSerpApiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Just Serp API failed (${response.status}): ${text}`);
  }

  const body = (await response.json()) as JustSerpEnvelope<T>;
  if (body.code !== undefined && body.code !== 200 && body.code !== 0) {
    throw new Error(`Just Serp API error (${body.code}): ${body.message ?? "unknown"}`);
  }

  return body.data as T;
}

export async function searchGoogleShoppingJustSerp(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  if (!isJustSerpConfigured()) return [];

  const mapping = resolveRegion(region);

  const data = await justSerpFetch<{
    shopping_results?: Array<{
      product_id?: string;
      title?: string;
      extracted_price?: number;
      price?: string;
      thumbnail?: string;
      link?: string;
      source?: string;
      rating?: number;
    }>;
  }>("/api/v1/google/shopping/search", {
    query,
    country: mapping.googleCountry,
    domain: "google.com",
    language: mapping.googleLanguage,
  });

  return (data.shopping_results ?? []).slice(0, 20).map((item) => ({
    id: item.product_id ?? crypto.randomUUID(),
    title: item.title ?? "Untitled product",
    price: item.extracted_price ?? parsePrice(item.price),
    platform: inferPlatform(item.source),
    image: item.thumbnail ?? null,
    shippingDays: null,
    supplier: item.source ?? "Retailer",
    rating: item.rating ?? null,
    sourceUrl: item.link ?? null,
    currency: mapping.currency,
    region,
    shipFrom: mapping.defaultShipFrom,
  }));
}

const REGION_GEO: Record<RegionCode, string> = {
  US: "US",
  UK: "GB",
  EU: "DE",
  GLOBAL: "",
};

export async function fetchGoogleTrendsJustSerp(
  keyword: string,
  region: RegionCode
): Promise<TrendSignal | null> {
  if (!isJustSerpConfigured()) return null;

  const canUse = await canUseProviderToday("justserp", ENV.justSerpDailyCap);
  if (!canUse) {
    console.warn("[Trends] Just Serp daily cap reached");
    return null;
  }

  const params: Record<string, string> = {
    query: keyword,
    data_type: "TIMESERIES",
    language: "en",
  };
  const geo = REGION_GEO[region];
  if (geo) params.geo = geo;

  try {
    const data = await justSerpFetch<{
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
    }>("/api/v1/google/trends/search", params);

    await incrementDailyApiUsage("justserp");

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
  } catch (err) {
    console.warn("[Trends] Just Serp failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

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

function parsePrice(value?: string): number {
  if (!value) return 0;
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : 0;
}

function inferPlatform(source?: string): string {
  const normalized = (source ?? "").toLowerCase();
  if (normalized.includes("amazon")) return "amazon";
  if (normalized.includes("ebay")) return "ebay";
  if (normalized.includes("walmart")) return "walmart";
  if (normalized.includes("etsy")) return "etsy";
  return "shopify";
}
