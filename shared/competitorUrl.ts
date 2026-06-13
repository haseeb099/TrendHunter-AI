import { sanitizeKeyword } from "./keywordUtils";

export type CompetitorUrlHint = {
  query: string;
  platform?: "amazon" | "ebay" | "shopify" | "tiktok" | "aliexpress" | "cj";
  host?: string;
};

const PATH_STOP_WORDS = new Set([
  "dp",
  "gp",
  "product",
  "products",
  "item",
  "itm",
  "p",
  "listing",
  "s",
  "sch",
  "i",
  "html",
  "stores",
  "store",
  "shop",
  "collections",
  "pages",
]);

function titleFromSlug(slug: string): string {
  return sanitizeKeyword(slug.replace(/[-_+]+/g, " ").replace(/\s+/g, " "));
}

function platformFromHost(hostname: string): CompetitorUrlHint["platform"] | undefined {
  const host = hostname.toLowerCase();
  if (host.includes("amazon.")) return "amazon";
  if (host.includes("ebay.")) return "ebay";
  if (host.includes("tiktok.")) return "tiktok";
  if (host.includes("aliexpress.")) return "aliexpress";
  if (host.includes("cjdropshipping.") || host.includes("cj.com")) return "cj";
  return undefined;
}

/** Infer a marketplace search query (and optional platform) from a competitor URL. */
export function extractCompetitorSearchQuery(input: string): CompetitorUrlHint | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^[\w-]+\.[\w.-]+(\/|$)/.test(trimmed) ||
    trimmed.includes("amazon.com") ||
    trimmed.includes("ebay.") ||
    trimmed.includes("/dp/");

  if (!looksLikeUrl) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const platform = platformFromHost(url.hostname);
    const host = url.hostname.replace(/^www\./, "");

    const queryParam =
      url.searchParams.get("k") ??
      url.searchParams.get("_nkw") ??
      url.searchParams.get("q") ??
      url.searchParams.get("query") ??
      url.searchParams.get("keyword") ??
      url.searchParams.get("search");

    if (queryParam) {
      const query = sanitizeKeyword(decodeURIComponent(queryParam.replace(/\+/g, " ")));
      if (query) return { query, platform, host };
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const dpIndex = parts.findIndex((part) => ["dp", "gp", "product"].includes(part.toLowerCase()));
    if (dpIndex > 0) {
      const candidate = parts[dpIndex - 1];
      if (candidate && !/^[A-Z0-9]{8,12}$/i.test(candidate)) {
        const query = titleFromSlug(candidate);
        if (query) return { query, platform: platform ?? "amazon", host };
      }
    }

    const productsIndex = parts.indexOf("products");
    if (productsIndex >= 0 && parts[productsIndex + 1]) {
      const query = titleFromSlug(parts[productsIndex + 1]);
      if (query) return { query, platform: platform ?? "shopify", host };
    }

    const collectionsIndex = parts.indexOf("collections");
    if (collectionsIndex >= 0 && parts[collectionsIndex + 1]) {
      const query = titleFromSlug(parts[collectionsIndex + 1]);
      if (query) return { query, platform: platform ?? "shopify", host };
    }

    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const segment = parts[i];
      if (PATH_STOP_WORDS.has(segment.toLowerCase())) continue;
      if (/^[A-Z0-9]{8,12}$/i.test(segment)) continue;
      if (/^\d+$/.test(segment)) continue;
      if (segment.length < 3) continue;
      const query = titleFromSlug(segment);
      if (query) return { query, platform, host };
    }

    const storeName = host.split(".")[0];
    if (storeName && storeName.length > 2 && !["amazon", "ebay", "www"].includes(storeName)) {
      return { query: titleFromSlug(storeName), platform, host };
    }

    return null;
  } catch {
    return null;
  }
}

export function resolveCompetitorSearchInput(options: {
  url?: string;
  keyword?: string;
}): { query: string; platform?: CompetitorUrlHint["platform"]; sourceUrl?: string } {
  const keyword = options.keyword?.trim() ?? "";
  const url = options.url?.trim() ?? "";

  if (keyword) {
    return { query: sanitizeKeyword(keyword), sourceUrl: url || undefined };
  }

  const extracted = url ? extractCompetitorSearchQuery(url) : null;
  if (extracted?.query) {
    return {
      query: extracted.query,
      platform: extracted.platform,
      sourceUrl: url,
    };
  }

  return { query: "", sourceUrl: url || undefined };
}
