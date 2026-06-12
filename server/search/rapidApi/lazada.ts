import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_lazada" as const;

type LazadaItem = {
  itemId?: string;
  title?: string;
  price?: string | number;
  image?: string;
  itemUrl?: string;
  shopName?: string;
};

type LazadaResponse = {
  result?: {
    result?: {
      data?: LazadaItem[];
      items?: LazadaItem[];
    };
    status?: { code?: number; msg?: unknown };
  };
};

const REGION_MAP: Partial<Record<RegionCode, string>> = {
  GLOBAL: "SG",
  EU: "MY",
};

/** Image search — 1 call can return many Lazada matches for a catalog image. */
export async function searchRapidLazadaByImage(
  imageUrl: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const lazadaRegion = REGION_MAP[region ?? "GLOBAL"] ?? "TH";

  const body = await rapidApiRequest<LazadaResponse>({
    provider: PROVIDER,
    path: "/item_search_image",
    query: {
      imgUrl: imageUrl,
      region: lazadaRegion,
    },
  });

  const statusCode = body?.result?.status?.code;
  if (statusCode && statusCode !== 200 && statusCode !== 0) return [];

  const bucket = body?.result?.result;
  const items = bucket?.data ?? bucket?.items ?? [];

  return items
    .filter((p) => p.title)
    .map((p, i) =>
      productFromFields(
        {
          id: `rapid-lazada-${p.itemId ?? i}`,
          title: p.title!,
          price: parseMoney(p.price),
          image: p.image ?? imageUrl,
          url: p.itemUrl ?? null,
          platform: "aliexpress",
          supplier: p.shopName ?? "Lazada",
        },
        region,
        "rapid_lazada"
      )
    );
}

export function isRapidLazadaConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiLazadaEnabled;
}
