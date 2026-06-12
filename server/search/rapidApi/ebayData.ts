import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_ebay_data" as const;

type EbayItem = {
  item_id?: string;
  title?: string;
  url?: string;
  image_url?: string;
  price?: number;
  currency?: string;
  seller_name?: string;
  condition?: string;
};

type EbaySearchResponse = {
  items?: EbayItem[];
};

const REGION_COUNTRY: Record<RegionCode, string> = {
  US: "us",
  UK: "uk",
  EU: "de",
  GLOBAL: "us",
};

export async function searchRapidEbayData(
  query: string,
  region?: RegionCode,
  options?: { limit?: number }
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<EbaySearchResponse>({
    provider: PROVIDER,
    path: "/search",
    query: {
      query,
      country: REGION_COUNTRY[region ?? "US"] ?? "us",
      limit: options?.limit ?? 20,
    },
  });

  return (body?.items ?? [])
    .filter((i) => i.title && i.item_id)
    .map((item, idx) =>
      productFromFields(
        {
          id: `rapid-ebay-${item.item_id ?? idx}`,
          title: item.title!,
          price: parseMoney(item.price),
          image: item.image_url ?? null,
          url: item.url ?? `https://www.ebay.com/itm/${item.item_id}`,
          platform: "ebay",
          supplier: item.seller_name ?? "eBay",
          category: item.condition,
        },
        region,
        "rapid_ebay"
      )
    );
}

export function isRapidEbayDataConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiEbayDataEnabled;
}
