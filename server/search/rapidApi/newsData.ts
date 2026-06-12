import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { productFromFields } from "./normalize";

const PROVIDER = "rapidapi_news_data" as const;

type NewsArticle = {
  title?: string;
  link?: string;
  snippet?: string;
  photo_url?: string;
  source_name?: string;
};

type NewsSearchResponse = {
  data?: NewsArticle[];
};

/** Real-Time News Data — trend/niche articles for intelligence ingest. */
export async function searchRapidNews(
  query: string,
  region?: RegionCode,
  options?: { limit?: number }
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<NewsSearchResponse>({
    provider: PROVIDER,
    path: "/search",
    query: {
      query,
      limit: options?.limit ?? 10,
    },
  });

  return (body?.data ?? [])
    .filter((a) => a.title && a.link)
    .map((a, i) =>
      productFromFields(
        {
          id: `rapid-news-${i}-${a.title!.slice(0, 24)}`,
          title: a.title!,
          price: 0,
          image: a.photo_url ?? null,
          url: a.link ?? null,
          platform: "shopify",
          supplier: a.source_name ?? "News",
          category: "intelligence",
        },
        region,
        "rapid_news"
      )
    );
}

export function isRapidNewsDataConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiNewsDataEnabled;
}
