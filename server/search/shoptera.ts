import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import {
  assertProviderBudget,
  ProviderBudgetExhaustedError,
  recordProviderApiCall,
} from "../dataPlatform/providerBudget";
import { PROVIDER_FETCH_LIMIT } from "./constants";
import { resolveRegion } from "./regions";

/** Shoptera — free public catalog, no API key (300 req/hr per IP). */
export function isShopteraEnabled() {
  return ENV.shopteraEnabled;
}

type ShopteraProduct = {
  title?: string;
  price?: number;
  currency?: string;
  product_url?: string;
  image_url?: string;
  brand?: string;
  category?: string;
  availability?: string;
  eshop_domain?: string;
};

export async function searchShoptera(
  query: string,
  region?: RegionCode,
  options?: { ingest?: boolean }
): Promise<ProductSearchResult[]> {
  try {
    await assertProviderBudget("shoptera", { ingest: options?.ingest });
  } catch (err) {
    if (err instanceof ProviderBudgetExhaustedError) return [];
    throw err;
  }

  const mapping = resolveRegion(region);
  const originCountry = mapping.shopteraOriginCountry;

  const url = new URL("https://shoptera.ai/api/v1/search/text");
  url.searchParams.set("title", query);
  url.searchParams.set("limit", String(Math.min(PROVIDER_FETCH_LIMIT, 50)));
  url.searchParams.set("origin_country", originCountry);
  url.searchParams.set("currency", mapping.currency === "GBP" ? "EUR" : mapping.currency);
  url.searchParams.set(
    "fields",
    "title,price,currency,product_url,image_url,brand,category,availability,eshop_domain"
  );

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    if (response.status === 404) {
      console.warn("[Shoptera] API unavailable (404) — catalog ingest skipped");
      return [];
    }
    const text = await response.text();
    throw new Error(`Shoptera failed (${response.status}): ${text.slice(0, 200)}`);
  }

  await recordProviderApiCall("shoptera");

  const data = (await response.json()) as {
    products?: ShopteraProduct[];
    results?: ShopteraProduct[];
  };

  const items = data.products ?? data.results ?? [];
  return items.slice(0, PROVIDER_FETCH_LIMIT).map((p, i) => ({
    id: `shoptera-${i}-${(p.title ?? query).slice(0, 24)}`,
    title: p.title ?? "Product",
    price: p.price ?? 0,
    platform: "shopify",
    image: p.image_url ?? null,
    shippingDays: null,
    supplier: p.eshop_domain ?? p.brand ?? "EU retail",
    rating: null,
    sourceUrl: p.product_url ?? null,
    region,
    currency: p.currency ?? mapping.currency,
    category: p.category,
    shipFrom: "EU",
    sourceProvider: "shoptera",
  }));
}
