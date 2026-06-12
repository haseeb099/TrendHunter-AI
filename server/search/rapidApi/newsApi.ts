import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { productFromFields } from "./normalize";

const PROVIDER = "rapidapi_news_api" as const;

type NewsApiArticle = {
  title?: string;
  url?: string;
  excerpt?: string;
  image?: string;
  source?: string;
};

type NewsApiResponse = {
  data?: NewsApiArticle[];
};

/** News API — 1000/mo, 10 articles per call. */
export async function searchRapidNewsApi(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<NewsApiResponse>({
    provider: PROVIDER,
    path: "/v2/search/articles",
    query: { query },
  });

  return (body?.data ?? [])
    .filter((a) => a.title && a.url)
    .map((a, i) =>
      productFromFields(
        {
          id: `rapid-newsapi-${i}-${a.title!.slice(0, 24)}`,
          title: a.title!,
          price: 0,
          image: a.image ?? null,
          url: a.url ?? null,
          platform: "shopify",
          supplier: a.source ?? "News API",
          category: "intelligence",
        },
        region,
        "rapid_news_api"
      )
    );
}

export function isRapidNewsApiConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiNewsApiEnabled;
}
