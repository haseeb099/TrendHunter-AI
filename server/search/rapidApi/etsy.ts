import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_etsy" as const;

type EtsyProduct = {
  listing_id?: number | string;
  title?: string;
  price?: number | string;
  currency_code?: string;
  url?: string;
  image?: string;
  shop_name?: string;
  rating?: number;
};

type EtsySearchResponse = {
  data?: EtsyProduct[];
  products?: EtsyProduct[];
  results?: EtsyProduct[];
};

export async function searchRapidEtsy(
  query: string,
  region?: RegionCode,
  options?: { page?: number }
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<EtsySearchResponse>({
    provider: PROVIDER,
    path: "/product/search",
    query: {
      query,
      page: options?.page ?? 1,
      currency: "USD",
      language: "en-US",
      country: region === "UK" ? "GB" : region === "EU" ? "DE" : "US",
      orderBy: "mostRelevant",
    },
  });

  if (!body) return [];

  const items = body.data ?? body.products ?? body.results ?? [];
  return items
    .filter((p) => p.title)
    .map((p, i) =>
      productFromFields(
        {
          id: `rapid-etsy-${p.listing_id ?? i}`,
          title: p.title!,
          price: parseMoney(p.price),
          image: p.image ?? null,
          url: p.url ?? null,
          rating: p.rating ?? null,
          platform: "shopify",
          supplier: p.shop_name ?? "Etsy",
        },
        region,
        "rapid_etsy"
      )
    );
}

export function isRapidEtsyConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiEtsyEnabled;
}
