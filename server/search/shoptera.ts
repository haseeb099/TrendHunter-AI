import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
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
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);
  const originCountry =
    mapping.defaultShipFrom === "UK"
      ? "DE"
      : mapping.defaultShipFrom === "EU"
        ? "DE"
        : mapping.googleCountry.toUpperCase() === "UK"
          ? "DE"
          : "DE";

  const url = new URL("https://shoptera.ai/api/products/search");
  url.searchParams.set("title", query);
  url.searchParams.set("limit", "20");
  url.searchParams.set("origin_country", originCountry);
  url.searchParams.set("currency", mapping.currency === "GBP" ? "EUR" : mapping.currency);

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shoptera failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    products?: ShopteraProduct[];
    results?: ShopteraProduct[];
  };

  const items = data.products ?? data.results ?? [];
  return items.slice(0, 20).map((p, i) => ({
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
    trendScore: 58,
  }));
}
