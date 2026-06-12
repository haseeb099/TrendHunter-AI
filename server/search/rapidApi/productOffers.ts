import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_product_search" as const;

type Offer = {
  offer_id?: string;
  offer_title?: string;
  offer_page_url?: string;
  price?: string;
  store_name?: string;
  on_sale?: boolean;
};

type OffersResponse = {
  status?: string;
  data?: {
    product_id?: string;
    product_title?: string;
    product_photos?: string[];
    offers?: Offer[];
    all_offers?: Offer[];
  };
};

const REGION_COUNTRY: Record<RegionCode, string> = {
  US: "us",
  UK: "gb",
  EU: "de",
  GLOBAL: "us",
};

/**
 * GET /product-offers — all merchant offers for one Google Shopping product_id.
 * 1 call → many offers (better data-per-request than repeated searches).
 */
export async function fetchRapidProductOffers(
  productId: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const country = REGION_COUNTRY[region ?? "US"] ?? "us";

  const body = await rapidApiRequest<OffersResponse>({
    provider: PROVIDER,
    path: "/product-offers",
    query: {
      product_id: productId,
      country,
      language: "en",
    },
  });

  const data = body?.data;
  if (!data) return [];

  const offers = data.all_offers ?? data.offers ?? [];
  const title = data.product_title ?? "Product";
  const image = data.product_photos?.[0] ?? null;

  return offers
    .filter((o) => o.offer_page_url || o.price)
    .map((o, i) =>
      productFromFields(
        {
          id: `rapid-offer-${o.offer_id ?? i}`,
          title: o.offer_title ?? title,
          price: parseMoney(o.price),
          image,
          url: o.offer_page_url ?? null,
          platform: "shopify",
          supplier: o.store_name ?? "Merchant",
        },
        region,
        "rapid_product"
      )
    );
}

export function isRapidProductOffersConfigured(): boolean {
  return (
    Boolean(ENV.rapidApiKey) &&
    ENV.rapidApiEnabled &&
    ENV.rapidApiProductSearchEnabled
  );
}
