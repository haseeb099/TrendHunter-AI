import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { ProviderBudgetExhaustedError } from "../dataPlatform/providerBudget";
import { PROVIDER_FETCH_LIMIT } from "./constants";
import { resolveRegion } from "./regions";
import {
  canUseAnySerperKey,
  getSerperApiKeys,
  isSerperPoolConfigured,
  isSerperQuotaError,
  markSerperKeyExhausted,
  recordSerperKeyUsage,
  resolveActiveSerperKey,
} from "./serperPool";

export { getSerperPoolStatus, serperPoolSummary } from "./serperPool";

/** Serper.dev — Google Search / Shopping / Images / News / Places (https://serper.dev) */
export function isSerperConfigured() {
  return isSerperPoolConfigured();
}

export type SerperEndpoint = "search" | "shopping" | "images" | "news" | "places";

type SerperShoppingItem = {
  title?: string;
  price?: string;
  source?: string;
  link?: string;
  imageUrl?: string;
  rating?: number;
  ratingCount?: number;
};

type SerperOrganicItem = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerperImageItem = {
  title?: string;
  imageUrl?: string;
  link?: string;
};

type SerperNewsItem = {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  date?: string;
};

type SerperPlaceItem = {
  title?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
};

function parseSerperPrice(raw?: string): number {
  if (!raw) return 0;
  const match = raw.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function inferPlatformFromSource(source?: string): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("amazon")) return "amazon";
  if (s.includes("ebay")) return "ebay";
  if (s.includes("walmart")) return "walmart";
  if (s.includes("etsy")) return "etsy";
  return "shopify";
}

/** POST to Serper with multi-key rotation — advances to next account when weekly cap or 429 hit. */
export async function serperPost<T>(
  endpoint: SerperEndpoint,
  body: Record<string, unknown>
): Promise<T> {
  const keys = getSerperApiKeys();
  if (keys.length === 0) {
    throw new ProviderBudgetExhaustedError("serper", "No Serper API keys configured");
  }

  let lastError = "All Serper accounts exhausted for this week";

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const slot = await resolveActiveSerperKey();
    if (!slot) {
      throw new ProviderBudgetExhaustedError("serper", lastError);
    }

    const response = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: "POST",
      headers: {
        "X-API-KEY": slot.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      if (isSerperQuotaError(response.status, text)) {
        await markSerperKeyExhausted(slot.index);
        lastError = `Serper account #${slot.index + 1} quota hit (${response.status})`;
        continue;
      }
      throw new Error(`Serper ${endpoint} failed (${response.status}): ${text.slice(0, 300)}`);
    }

    await recordSerperKeyUsage(slot.index);
    return JSON.parse(text) as T;
  }

  throw new ProviderBudgetExhaustedError("serper", lastError);
}

function baseBody(query: string, region?: RegionCode) {
  const mapping = resolveRegion(region);
  return {
    q: query,
    gl: mapping.googleCountry,
    hl: mapping.googleLanguage,
  };
}

export async function searchGoogleShoppingSerper(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isSerperConfigured()) return [];
  if (!(await canUseAnySerperKey())) return [];

  const maxResults = options?.maxResults ?? PROVIDER_FETCH_LIMIT;
  const mapping = resolveRegion(region);

  const data = await serperPost<{ shopping?: SerperShoppingItem[] }>("shopping", {
    ...baseBody(query, region),
    num: Math.min(maxResults, PROVIDER_FETCH_LIMIT),
  });

  const items = data.shopping ?? [];
  return items.slice(0, maxResults).map((item, i) => ({
    id: `serper-shop-${i}-${(item.title ?? query).slice(0, 24)}`,
    title: item.title ?? "Product",
    price: parseSerperPrice(item.price),
    platform: inferPlatformFromSource(item.source),
    image: item.imageUrl ?? null,
    shippingDays: null,
    supplier: item.source ?? "Google Shopping",
    rating: item.rating ?? null,
    sourceUrl: item.link ?? null,
    region,
    currency: mapping.currency,
    shipFrom: mapping.defaultShipFrom,
    sourceProvider: "serper",
  }));
}

/** Web search — competitor titles, niche discovery, related queries. */
export async function searchWebSerper(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isSerperConfigured() || !(await canUseAnySerperKey())) return [];

  const maxResults = options?.maxResults ?? 10;
  const mapping = resolveRegion(region);

  const data = await serperPost<{ organic?: SerperOrganicItem[] }>("search", {
    ...baseBody(query, region),
    num: Math.min(maxResults, 10),
  });

  return (data.organic ?? []).slice(0, maxResults).map((item, i) => ({
    id: `serper-web-${i}-${(item.title ?? query).slice(0, 20)}`,
    title: item.title ?? query,
    price: 0,
    platform: "shopify",
    image: null,
    shippingDays: null,
    supplier: "Web",
    rating: null,
    sourceUrl: item.link ?? null,
    region,
    currency: mapping.currency,
    shipFrom: mapping.defaultShipFrom,
    sourceProvider: "serper",
  }));
}

/** Image search — product visuals for social kit / listings. */
export async function searchImagesSerper(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isSerperConfigured() || !(await canUseAnySerperKey())) return [];

  const maxResults = options?.maxResults ?? 10;
  const mapping = resolveRegion(region);

  const data = await serperPost<{ images?: SerperImageItem[] }>("images", {
    ...baseBody(query, region),
    num: Math.min(maxResults, 10),
  });

  return (data.images ?? []).slice(0, maxResults).map((item, i) => ({
    id: `serper-img-${i}-${query.slice(0, 16)}`,
    title: item.title ?? `${query} (image)`,
    price: 0,
    platform: "shopify",
    image: item.imageUrl ?? null,
    shippingDays: null,
    supplier: "Image search",
    rating: null,
    sourceUrl: item.link ?? null,
    region,
    currency: mapping.currency,
    shipFrom: mapping.defaultShipFrom,
    sourceProvider: "serper",
  }));
}

/** News search — rising niche / trend validation signals. */
export async function searchNewsSerper(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isSerperConfigured() || !(await canUseAnySerperKey())) return [];

  const maxResults = options?.maxResults ?? 8;
  const mapping = resolveRegion(region);

  const data = await serperPost<{ news?: SerperNewsItem[] }>("news", {
    ...baseBody(query, region),
    num: Math.min(maxResults, 10),
  });

  return (data.news ?? []).slice(0, maxResults).map((item, i) => ({
    id: `serper-news-${i}-${(item.title ?? query).slice(0, 20)}`,
    title: item.title ?? query,
    price: 0,
    platform: "shopify",
    image: null,
    shippingDays: null,
    supplier: item.source ?? "News",
    rating: null,
    sourceUrl: item.link ?? null,
    region,
    currency: mapping.currency,
    shipFrom: mapping.defaultShipFrom,
    sourceProvider: "serper",
  }));
}

/** Places / Maps — local suppliers and retailers. */
export async function searchPlacesSerper(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isSerperConfigured() || !(await canUseAnySerperKey())) return [];

  const maxResults = options?.maxResults ?? 8;
  const mapping = resolveRegion(region);

  const data = await serperPost<{ places?: SerperPlaceItem[] }>("places", {
    ...baseBody(`${query} supplier wholesale`, region),
  });

  return (data.places ?? []).slice(0, maxResults).map((item, i) => ({
    id: `serper-place-${i}-${(item.title ?? query).slice(0, 20)}`,
    title: item.title ?? query,
    price: 0,
    platform: "shopify",
    image: null,
    shippingDays: null,
    supplier: item.title ?? "Local supplier",
    rating: item.rating ?? null,
    sourceUrl: item.website ?? null,
    region,
    currency: mapping.currency,
    shipFrom: mapping.defaultShipFrom,
    sourceProvider: "serper",
  }));
}

type SerperSearchExtras = {
  relatedSearches?: Array<{ query?: string }>;
  peopleAlsoAsk?: Array<{ question?: string }>;
};

/** Related queries from Serper web search — used for discovery & suggestions. */
export async function getSerperRelatedQueries(
  query: string,
  region?: RegionCode,
  limit = 8
): Promise<string[]> {
  if (!isSerperConfigured() || !(await canUseAnySerperKey())) return [];

  try {
    const data = await serperPost<SerperSearchExtras & { organic?: SerperOrganicItem[] }>(
      "search",
      { ...baseBody(query, region), num: 5 }
    );

    const related = (data.relatedSearches ?? [])
      .map((r) => r.query?.trim())
      .filter((q): q is string => Boolean(q && q.length >= 3));

    const paa = (data.peopleAlsoAsk ?? [])
      .map((p) => p.question?.trim())
      .filter((q): q is string => Boolean(q && q.length >= 3));

    return Array.from(new Set([...related, ...paa])).slice(0, limit);
  } catch {
    return [];
  }
}

/** Run all Serper endpoints for one query (counts as 5 API calls). */
export async function searchAllSerperEndpoints(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const batches = await Promise.allSettled([
    searchGoogleShoppingSerper(query, region, { maxResults: 15 }),
    searchWebSerper(query, region, { maxResults: 8 }),
    searchImagesSerper(query, region, { maxResults: 6 }),
    searchNewsSerper(query, region, { maxResults: 5 }),
    searchPlacesSerper(query, region, { maxResults: 5 }),
  ]);

  const merged: ProductSearchResult[] = [];
  for (const batch of batches) {
    if (batch.status === "fulfilled") merged.push(...batch.value);
  }
  return merged;
}
