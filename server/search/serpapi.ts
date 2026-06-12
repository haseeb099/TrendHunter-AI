import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import {
  assertProviderBudget,
  ProviderBudgetExhaustedError,
  recordProviderApiCall,
} from "../dataPlatform/providerBudget";
import { PROVIDER_FETCH_LIMIT } from "./constants";
import { resolveRegion } from "./regions";
import { isJustSerpConfigured, searchGoogleShoppingJustSerp } from "./justserp";
import { isSerperConfigured, searchGoogleShoppingSerper } from "./serper";

export function isSerpApiConfigured() {
  return Boolean(ENV.serpApiKey);
}

/** True when SerpAPI, Serper.dev, or Just Serp can serve Google Shopping / Trends. */
export function isSerpConfigured() {
  return isSerpApiConfigured() || isSerperConfigured() || isJustSerpConfigured();
}

async function serpFetch(params: Record<string, string>) {
  try {
    await assertProviderBudget("serpapi");
  } catch (err) {
    if (err instanceof ProviderBudgetExhaustedError) {
      throw err;
    }
    throw err;
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("api_key", ENV.serpApiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SerpAPI failed (${response.status}): ${text}`);
  }
  await recordProviderApiCall("serpapi");
  return response.json();
}

type AmazonOrganicResult = {
  asin?: string;
  title?: string;
  price?: string;
  extracted_price?: number;
  thumbnail?: string;
  link?: string;
  rating?: number;
};

function mapAmazonItem(
  item: AmazonOrganicResult,
  region: RegionCode | undefined,
  currency: string
): ProductSearchResult {
  return {
    id: item.asin ?? crypto.randomUUID(),
    title: item.title ?? "Untitled product",
    price: item.extracted_price ?? parsePrice(item.price),
    platform: "amazon",
    image: item.thumbnail ?? null,
    shippingDays: null,
    supplier: "Amazon",
    rating: item.rating ?? null,
    sourceUrl: item.link ?? null,
    currency,
    region,
    shipFrom: resolveRegion(region).defaultShipFrom,
  };
}

async function fetchAmazonPage(
  query: string,
  region: RegionCode | undefined,
  page: number
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);

  const data = (await serpFetch({
    engine: "amazon",
    k: query,
    amazon_domain: mapping.amazonDomain,
    page: String(page),
  })) as { organic_results?: AmazonOrganicResult[] };

  return (data.organic_results ?? []).map((item) => mapAmazonItem(item, region, mapping.currency));
}

export async function searchAmazon(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isSerpApiConfigured()) return [];

  const maxResults = options?.maxResults ?? PROVIDER_FETCH_LIMIT;
  const results: ProductSearchResult[] = [];
  let page = 1;

  while (results.length < maxResults) {
    const pageResults = await fetchAmazonPage(query, region, page);
    if (pageResults.length === 0) break;
    results.push(...pageResults.slice(0, maxResults - results.length));
    if (pageResults.length < PROVIDER_FETCH_LIMIT) break;
    page += 1;
  }

  return results;
}

type GoogleShoppingResult = {
  product_id?: string;
  title?: string;
  extracted_price?: number;
  price?: string;
  thumbnail?: string;
  link?: string;
  source?: string;
  rating?: number;
};

function mapGoogleShoppingItem(
  item: GoogleShoppingResult,
  region: RegionCode | undefined,
  currency: string
): ProductSearchResult {
  return {
    id: item.product_id ?? crypto.randomUUID(),
    title: item.title ?? "Untitled product",
    price: item.extracted_price ?? parsePrice(item.price),
    platform: inferPlatform(item.source),
    image: item.thumbnail ?? null,
    shippingDays: null,
    supplier: item.source ?? "Retailer",
    rating: item.rating ?? null,
    sourceUrl: item.link ?? null,
    currency,
    region,
    shipFrom: resolveRegion(region).defaultShipFrom,
  };
}

async function fetchGoogleShoppingSerpApiPage(
  query: string,
  region: RegionCode | undefined,
  start: number
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);

  const data = (await serpFetch({
    engine: "google_shopping",
    q: query,
    google_domain: "google.com",
    gl: mapping.googleCountry,
    hl: mapping.googleLanguage,
    start: String(start),
  })) as { shopping_results?: GoogleShoppingResult[] };

  return (data.shopping_results ?? []).map((item) =>
    mapGoogleShoppingItem(item, region, mapping.currency)
  );
}

async function searchGoogleShoppingSerpApi(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  const maxResults = options?.maxResults ?? PROVIDER_FETCH_LIMIT;
  const results: ProductSearchResult[] = [];
  let start = 0;

  while (results.length < maxResults) {
    const page = await fetchGoogleShoppingSerpApiPage(query, region, start);
    if (page.length === 0) break;
    results.push(...page.slice(0, maxResults - results.length));
    if (page.length < PROVIDER_FETCH_LIMIT) break;
    start += page.length;
  }

  return results;
}

export async function searchGoogleShopping(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  const maxResults = options?.maxResults ?? PROVIDER_FETCH_LIMIT;

  if (isSerperConfigured()) {
    try {
      const results = await searchGoogleShoppingSerper(query, region, { maxResults });
      if (results.length > 0) return results;
    } catch (err) {
      console.warn(
        "[Search] Serper Google Shopping failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  if (isSerpApiConfigured()) {
    try {
      const results = await searchGoogleShoppingSerpApi(query, region, { maxResults });
      if (results.length > 0) return results;
    } catch (err) {
      console.warn(
        "[Search] SerpAPI Google Shopping failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  if (isJustSerpConfigured()) {
    try {
      return await searchGoogleShoppingJustSerp(query, region);
    } catch (err) {
      console.warn(
        "[Search] Just Serp Google Shopping failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return [];
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
