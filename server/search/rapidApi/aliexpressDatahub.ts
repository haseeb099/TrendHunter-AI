import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_aliexpress_datahub" as const;

type DatahubItem = {
  itemId?: string;
  title?: string;
  image?: string;
  salePrice?: string | number;
  itemUrl?: string;
};

type DatahubResponse = {
  result?: {
    status?: { data?: string; code?: number };
    result?: {
      resultList?: DatahubItem[];
      items?: DatahubItem[];
    };
  };
};

export async function searchRapidAliexpressDatahub(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<DatahubResponse>({
    provider: PROVIDER,
    path: "/item_search",
    query: { q: query, page: 1 },
  });

  if (body?.result?.status?.data === "error") return [];

  const bucket = body?.result?.result;
  const items = bucket?.resultList ?? bucket?.items ?? [];

  return items
    .filter((i) => i.title)
    .map((item, idx) =>
      productFromFields(
        {
          id: `rapid-aedh-${item.itemId ?? idx}`,
          title: item.title!,
          price: parseMoney(item.salePrice),
          image: item.image ?? null,
          url: item.itemUrl ?? (item.itemId ? `https://www.aliexpress.com/item/${item.itemId}.html` : null),
          platform: "aliexpress",
          supplier: "AliExpress",
        },
        region,
        "rapid_aliexpress"
      )
    );
}

export function isRapidAliexpressDatahubConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiAliexpressDatahubEnabled;
}
