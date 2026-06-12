import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_amazon" as const;

type AmazonProduct = {
  asin?: string;
  product_title?: string;
  product_price?: string | number;
  product_photo?: string;
  product_url?: string;
  product_star_rating?: string | number;
  product_num_ratings?: number;
};

type AmazonSearchResponse = {
  status?: string;
  data?: {
    products?: AmazonProduct[];
    total_products?: number;
  };
};

const REGION_COUNTRY: Record<RegionCode, string> = {
  US: "US",
  UK: "GB",
  EU: "DE",
  GLOBAL: "US",
};

/** GET /search on Real-Time Amazon Data — shares rapidapi_amazon monthly cap. */
export async function searchRapidAmazonProducts(
  query: string,
  region?: RegionCode,
  options?: { page?: number; maxResults?: number }
): Promise<ProductSearchResult[]> {
  const country = REGION_COUNTRY[region ?? "US"] ?? "US";
  const page = options?.page ?? 1;
  const max = options?.maxResults ?? 10;

  const body = await rapidApiRequest<AmazonSearchResponse>({
    provider: PROVIDER,
    path: "/search",
    query: {
      query,
      country,
      page,
      language: country === "GB" ? "en_GB" : country === "DE" ? "de_DE" : "en_US",
      sort_by: "RELEVANCE",
    },
  });

  const items = body?.data?.products ?? [];
  return items
    .filter((p) => p.product_title && p.asin)
    .slice(0, max)
    .map((p, i) =>
      productFromFields(
        {
          id: `rapid-amz-${p.asin ?? i}`,
          title: p.product_title!,
          price: parseMoney(p.product_price),
          image: p.product_photo ?? null,
          url: p.product_url ?? `https://www.amazon.com/dp/${p.asin}`,
          rating: p.product_star_rating != null ? parseMoney(p.product_star_rating) : null,
          platform: "amazon",
          supplier: "Amazon",
        },
        region,
        "rapid_amazon"
      )
    );
}

export function isRapidAmazonSearchConfigured(): boolean {
  return (
    Boolean(ENV.rapidApiKey) &&
    ENV.rapidApiEnabled &&
    ENV.rapidApiAmazonEnabled
  );
}
