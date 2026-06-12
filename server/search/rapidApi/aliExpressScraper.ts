import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_ali_express" as const;

type AliItem = {
  productId?: string;
  title?: { displayTitle?: string; seoTitle?: string };
  image?: { imgUrl?: string };
  prices?: { salePrice?: { minPrice?: number } };
  evaluation?: { starRating?: number };
};

type AliSearchResponse = {
  data?: {
    result?: {
      searchResult?: {
        mods?: {
          itemList?: { content?: AliItem[] };
        };
      };
    };
  };
};

export async function searchRapidAliExpress(
  query: string,
  region?: RegionCode,
  options?: { page?: number }
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<AliSearchResponse>({
    provider: PROVIDER,
    path: "/search",
    query: {
      query,
      page: options?.page ?? 1,
    },
  });

  const items = body?.data?.result?.searchResult?.mods?.itemList?.content ?? [];

  return items
    .filter((i) => i.productId && (i.title?.displayTitle || i.title?.seoTitle))
    .map((item, idx) => {
      const title = item.title?.displayTitle ?? item.title?.seoTitle ?? "AliExpress product";
      const img = item.image?.imgUrl;
      const image = img ? (img.startsWith("//") ? `https:${img}` : img) : null;

      return productFromFields(
        {
          id: `rapid-aliexpress-${item.productId ?? idx}`,
          title,
          price: parseMoney(item.prices?.salePrice?.minPrice),
          image,
          url: `https://www.aliexpress.com/item/${item.productId}.html`,
          rating: item.evaluation?.starRating ?? null,
          platform: "aliexpress",
          supplier: "AliExpress",
        },
        region,
        "rapid_aliexpress"
      );
    });
}

export function isRapidAliExpressConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiAliExpressEnabled;
}
