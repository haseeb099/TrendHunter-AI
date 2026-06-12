import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { parseMoney, productFromFields } from "./normalize";

const PROVIDER = "rapidapi_axesso_walmart" as const;

type WalmartItem = {
  usItemId?: string;
  name?: string;
  image?: string;
  canonicalUrl?: string;
  price?: number;
  priceInfo?: { minPrice?: number; linePrice?: string };
  rating?: { averageRating?: number; numberOfReviews?: number };
  sellerName?: string;
};

type AxessoResponse = {
  item?: {
    props?: {
      pageProps?: {
        initialData?: {
          searchResult?: {
            itemStacks?: Array<{ items?: WalmartItem[] }>;
          };
        };
      };
    };
  };
};

export async function searchRapidAxessoWalmart(
  query: string,
  region?: RegionCode,
  options?: { page?: number }
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<AxessoResponse>({
    provider: PROVIDER,
    path: "/wlm/walmart-search-by-keyword",
    query: {
      keyword: query,
      page: options?.page ?? 1,
      sortBy: "best_match",
    },
  });

  const stacks = body?.item?.props?.pageProps?.initialData?.searchResult?.itemStacks ?? [];
  const items = stacks.flatMap((s) => s.items ?? []);

  return items
    .filter((i) => i.name && i.usItemId)
    .slice(0, 40)
    .map((item, idx) => {
      const price =
        parseMoney(item.price) ||
        parseMoney(item.priceInfo?.minPrice) ||
        parseMoney(item.priceInfo?.linePrice);
      const url = item.canonicalUrl
        ? `https://www.walmart.com${item.canonicalUrl}`
        : `https://www.walmart.com/ip/${item.usItemId}`;

      return productFromFields(
        {
          id: `rapid-walmart-${item.usItemId ?? idx}`,
          title: item.name!,
          price,
          image: item.image ?? null,
          url,
          rating: item.rating?.averageRating ?? null,
          platform: "shopify",
          supplier: item.sellerName ?? "Walmart",
        },
        region ?? "US",
        "rapid_walmart"
      );
    });
}

export function isRapidAxessoWalmartConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiAxessoWalmartEnabled;
}
