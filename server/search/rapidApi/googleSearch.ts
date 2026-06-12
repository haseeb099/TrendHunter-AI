import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { rapidApiRequest } from "./client";
import { productFromFields } from "./normalize";
import { ENV } from "../../_core/env";

const PROVIDER = "rapidapi_google_search" as const;

type GoogleResult = {
  position?: number;
  url?: string;
  title?: string;
  description?: string;
  rating?: number;
  rating_count?: string;
};

type GoogleSearchResponse = {
  search_term?: string;
  results?: GoogleResult[];
};

/** Organic Google results → lightweight discovery listings (1 call, many URLs). */
export async function searchRapidGoogle(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  const max = options?.maxResults ?? 8;

  const body = await rapidApiRequest<GoogleSearchResponse>({
    provider: PROVIDER,
    path: "/",
    query: { query },
  });

  const items = body?.results ?? [];
  return items
    .slice(0, max)
    .filter((r) => r.title && r.url)
    .map((r, i) =>
      productFromFields(
        {
          id: `rapid-google-${i}-${(r.title ?? query).slice(0, 32)}`,
          title: r.title!,
          price: 0,
          url: r.url ?? null,
          rating: r.rating ?? null,
          platform: "shopify",
          supplier: "Google",
          category: "discovery",
        },
        region,
        "rapid_google"
      )
    );
}

export function isRapidGoogleSearchConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiGoogleSearchEnabled;
}
