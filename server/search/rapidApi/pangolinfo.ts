import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_pangolinfo" as const;

type PangolItem = {
  asin?: string;
  title?: string;
  price?: string | number;
  image?: string;
  url?: string;
  rating?: number;
  reviews?: number;
};

type PangolResponse = {
  data?: PangolItem[];
  products?: PangolItem[];
  results?: PangolItem[];
};

/** Pangolinfo root scraper — subscription may require extra params. */
export async function searchRapidPangolinfoAmazon(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<PangolResponse>({
    provider: PROVIDER,
    path: "/",
    query: { keyword: query, q: query },
  });

  if (!body || (body as { code?: number }).code === 1004) return [];

  const items = body.data ?? body.products ?? body.results ?? [];
  return items
    .filter((p) => p.title)
    .map((p, i) =>
      productFromFields(
        {
          id: `rapid-pangol-${p.asin ?? i}`,
          title: p.title!,
          price: parseMoney(p.price),
          image: p.image ?? null,
          url: p.url ?? null,
          rating: p.rating ?? null,
          reviews: p.reviews ?? null,
          platform: "amazon",
          supplier: "Amazon",
        },
        region,
        "rapid_amazon_scraper"
      )
    );
}

export function isRapidPangolinfoConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiPangolinfoEnabled;
}
