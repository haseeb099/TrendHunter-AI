import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_product_search" as const;

type RapidProduct = {
  product_id?: string;
  product_title?: string;
  product_photos?: string[];
  product_page_url?: string;
  product_rating?: number;
  product_num_reviews?: number;
  typical_price_range?: string[];
  offer?: {
    price?: string;
    offer_page_url?: string;
    store_name?: string;
  };
};

type RapidProductResponse = {
  status?: string;
  data?: {
    products?: RapidProduct[];
    sponsored_products?: RapidProduct[];
  };
};

const REGION_COUNTRY: Record<RegionCode, string> = {
  US: "us",
  UK: "gb",
  EU: "de",
  GLOBAL: "us",
};

function mapRapidProduct(
  item: RapidProduct,
  index: number,
  query: string,
  region: RegionCode | undefined,
  mode: "search" | "deals"
): ProductSearchResult | null {
  const title = item.product_title?.trim();
  if (!title) return null;

  const price =
    parseMoney(item.offer?.price) ||
    parseMoney(item.typical_price_range?.[0]) ||
    0;

  const id = item.product_id?.slice(0, 80) ?? `${mode}-${index}-${title.slice(0, 24)}`;

  return productFromFields(
    {
      id: `rapid-${mode}-${id}`,
      title,
      price,
      image: item.product_photos?.[0] ?? null,
      url: item.offer?.offer_page_url ?? item.product_page_url ?? null,
      rating: item.product_rating ?? null,
      reviews: item.product_num_reviews ?? null,
      platform: "shopify",
      supplier: item.offer?.store_name ?? "Google Shopping",
    },
    region,
    "rapid_product"
  );
}

function extractProducts(body: RapidProductResponse | null): RapidProduct[] {
  if (!body?.data) return [];
  const organic = body.data.products ?? [];
  const sponsored = (body.data.sponsored_products ?? []).filter((p) => p.product_title);
  return [...organic, ...sponsored];
}

/** GET /search — up to limit products per call (default 10). */
export async function searchRapidProducts(
  query: string,
  region?: RegionCode,
  options?: { limit?: number; deals?: boolean }
): Promise<ProductSearchResult[]> {
  const country = REGION_COUNTRY[region ?? "US"] ?? "us";
  const limit = Math.min(options?.limit ?? ENV.rapidApiProductSearchLimit, 10);
  const path = options?.deals ? "/deals" : "/search";

  const body = await rapidApiRequest<RapidProductResponse>({
    provider: PROVIDER,
    path,
    query: {
      q: query,
      limit,
      offset: 0,
      country,
      language: "en",
      sort_by: "BEST_MATCH",
      product_condition: "ANY",
    },
  });

  const mode = options?.deals ? "deals" : "search";
  return extractProducts(body)
    .map((item, i) => mapRapidProduct(item, i, query, region, mode))
    .filter((p): p is ProductSearchResult => p != null)
    .slice(0, limit);
}

export function isRapidProductSearchConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiProductSearchEnabled;
}
