import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../../_core/env";
import { rapidApiRequest } from "./client";
import { productFromFields } from "./normalize";

const PROVIDER = "rapidapi_web_search" as const;

type WebResult = {
  title?: string;
  url?: string;
  snippet?: string;
  domain?: string;
};

type WebSearchResponse = {
  data?: {
    organic_results?: WebResult[];
  };
};

/** Real-Time Web Search — organic Google results (num up to 10). */
export async function searchRapidWeb(
  query: string,
  region?: RegionCode,
  options?: { num?: number }
): Promise<ProductSearchResult[]> {
  const body = await rapidApiRequest<WebSearchResponse>({
    provider: PROVIDER,
    path: "/search",
    query: {
      q: query,
      num: options?.num ?? 10,
      gl: region === "UK" ? "gb" : region === "EU" ? "de" : "us",
      hl: "en",
    },
  });

  return (body?.data?.organic_results ?? [])
    .filter((r) => r.title && r.url)
    .map((r, i) =>
      productFromFields(
        {
          id: `rapid-web-${i}-${r.title!.slice(0, 24)}`,
          title: r.title!,
          price: 0,
          url: r.url ?? null,
          platform: "shopify",
          supplier: r.domain ?? "Web",
          category: "discovery",
        },
        region,
        "rapid_web"
      )
    );
}

export function isRapidWebSearchConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled && ENV.rapidApiWebSearchEnabled;
}
