import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { resolveRegion } from "./regions";

export function isSerpApiConfigured() {
  return Boolean(ENV.serpApiKey);
}

async function serpFetch(params: Record<string, string>) {
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
  return response.json();
}

export async function searchAmazon(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  if (!isSerpApiConfigured()) return [];

  const mapping = resolveRegion(region);

  const data = (await serpFetch({
    engine: "amazon",
    k: query,
    amazon_domain: mapping.amazonDomain,
  })) as {
    organic_results?: Array<{
      asin?: string;
      title?: string;
      price?: string;
      extracted_price?: number;
      thumbnail?: string;
      link?: string;
      rating?: number;
    }>;
  };

  return (data.organic_results ?? []).slice(0, 20).map((item) => ({
    id: item.asin ?? crypto.randomUUID(),
    title: item.title ?? "Untitled product",
    price: item.extracted_price ?? parsePrice(item.price),
    platform: "amazon",
    image: item.thumbnail ?? null,
    shippingDays: null,
    supplier: "Amazon",
    rating: item.rating ?? null,
    sourceUrl: item.link ?? null,
    currency: mapping.currency,
    region,
    shipFrom: mapping.defaultShipFrom,
  }));
}

export async function searchGoogleShopping(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  if (!isSerpApiConfigured()) return [];

  const mapping = resolveRegion(region);

  const data = (await serpFetch({
    engine: "google_shopping",
    q: query,
    google_domain: "google.com",
    gl: mapping.googleCountry,
    hl: mapping.googleLanguage,
  })) as {
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
  };

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
