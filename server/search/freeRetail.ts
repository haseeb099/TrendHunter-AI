import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { PROVIDER_FETCH_LIMIT } from "./constants";
import { resolveRegion } from "./regions";

/** Always-free public catalogs — no API key, no signup. */
export function isFreeRetailEnabled() {
  return ENV.freeRetailEnabled;
}

type DummyJsonProduct = {
  id: number;
  title: string;
  description?: string;
  price: number;
  thumbnail?: string;
  images?: string[];
  rating?: number;
  brand?: string;
  category?: string;
};

type FakeStoreProduct = {
  id: number;
  title: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  rating?: { rate?: number };
};

async function searchDummyJson(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);
  const url = new URL("https://dummyjson.com/products/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(PROVIDER_FETCH_LIMIT));

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`DummyJSON failed (${response.status})`);
  }

  const data = (await response.json()) as { products?: DummyJsonProduct[] };
  return (data.products ?? []).map((p) => mapFreeRetailProduct(p, "dummyjson", region, mapping.currency));
}

async function searchFakeStore(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);
  const url = new URL("https://fakestoreapi.com/products");
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`FakeStore API failed (${response.status})`);
  }

  const data = (await response.json()) as FakeStoreProduct[];
  const q = query.toLowerCase();
  const filtered = data.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
  );

  return filtered.slice(0, PROVIDER_FETCH_LIMIT).map((p) =>
    mapFreeRetailProduct(
      {
        id: p.id,
        title: p.title,
        price: p.price,
        thumbnail: p.image,
        rating: p.rating?.rate,
        category: p.category,
        brand: "FakeStore",
      },
      "fakestore",
      region,
      mapping.currency
    )
  );
}

function mapFreeRetailProduct(
  p: DummyJsonProduct,
  source: "dummyjson" | "fakestore",
  region?: RegionCode,
  currency = "USD"
): ProductSearchResult {
  const image = p.thumbnail ?? p.images?.[0] ?? null;
  return {
    id: `${source}-${p.id}`,
    title: p.title,
    price: p.price,
    platform: "shopify",
    image,
    shippingDays: null,
    supplier: p.brand ?? "Retail catalog",
    rating: p.rating ?? null,
    sourceUrl: source === "dummyjson" ? `https://dummyjson.com/products/${p.id}` : `https://fakestoreapi.com/products/${p.id}`,
    region,
    currency,
    category: p.category,
    shipFrom: resolveRegion(region).defaultShipFrom,
    sourceProvider: "free_retail",
  };
}

export async function searchFreeRetail(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const settled = await Promise.allSettled([
    searchDummyJson(query, region),
    searchFakeStore(query, region),
  ]);

  const merged: ProductSearchResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      merged.push(...outcome.value);
    }
  }

  if (merged.length === 0) {
    const errors = settled
      .filter((o): o is PromiseRejectedResult => o.status === "rejected")
      .map((o) => o.reason);
    if (errors.length === settled.length) {
      throw errors[0] instanceof Error ? errors[0] : new Error("Free retail search failed");
    }
  }

  return merged;
}
