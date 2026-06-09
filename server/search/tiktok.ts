import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { resolveRegion } from "./regions";
import { tiktokShopRequest } from "./tiktokShopClient";

export function isTikTokOfficialConfigured() {
  return Boolean(
    ENV.tiktokAppKey && ENV.tiktokAppSecret && ENV.tiktokAccessToken
  );
}

export function isTikTokThirdPartyConfigured() {
  return Boolean(ENV.tiktokShopApiKey);
}

export function isTikTokConfigured() {
  return isTikTokOfficialConfigured() || isTikTokThirdPartyConfigured();
}

export async function searchTikTok(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  if (isTikTokOfficialConfigured()) {
    return searchTikTokOfficial(query, region);
  }
  if (isTikTokThirdPartyConfigured()) {
    return searchTikTokThirdParty(query, region);
  }
  return [];
}

async function searchTikTokOfficial(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);
  const version = ENV.tiktokApiVersion;
  const data = await tiktokShopRequest<{
    products?: Array<Record<string, unknown>>;
    product_list?: Array<Record<string, unknown>>;
  }>({
    method: "POST",
    path: `/affiliate_creator/${version}/open_collaborations/products/search`,
    query: { page_size: 20 },
    body: { keyword: query },
  });

  const products = data.products ?? data.product_list ?? [];
  return products.slice(0, 20).map((p) => mapTikTokProduct(p, region, mapping.currency));
}

async function searchTikTokThirdParty(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const provider = ENV.tiktokShopProvider;

  if (provider === "justoneapi") {
    return searchJustOneApi(query, region);
  }

  return searchScrapeCreators(query, region);
}

async function searchScrapeCreators(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);
  const base =
    ENV.tiktokShopApiBase?.trim().replace(/\/$/, "") ||
    "https://api.scrapecreators.com/v1/tiktok/shop/search";
  const url = new URL(base);
  url.searchParams.set("query", query);
  url.searchParams.set("amount", "20");

  const response = await fetch(url, {
    headers: {
      "x-api-key": ENV.tiktokShopApiKey,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TikTok Shop proxy failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    products?: Array<Record<string, unknown>>;
    data?: Array<Record<string, unknown>>;
    results?: Array<Record<string, unknown>>;
  };

  const items = data.products ?? data.data ?? data.results ?? [];
  return items.slice(0, 20).map((p) => mapTikTokProduct(p, region, mapping.currency));
}

/** JustOneAPI uses GB (not UK) and FR for EU — see docs.justoneapi.com */
function mapJustOneApiRegion(region?: RegionCode): string {
  const code = region ?? (ENV.defaultRegion as RegionCode);
  switch (code) {
    case "UK":
      return "GB";
    case "EU":
      return "FR";
    case "GLOBAL":
      return ENV.tiktokShopRegion === "UK" ? "GB" : ENV.tiktokShopRegion || "US";
    default:
      return "US";
  }
}

async function searchJustOneApi(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  const mapping = resolveRegion(region);
  const base =
    ENV.tiktokShopApiBase?.trim().replace(/\/$/, "") ||
    "https://api.justoneapi.com/api/tiktok-shop/search-products/v1";
  const url = new URL(base);
  url.searchParams.set("token", ENV.tiktokShopApiKey);
  url.searchParams.set("keyword", query);
  url.searchParams.set("region", mapJustOneApiRegion(region));

  const response = await fetch(url, { headers: { accept: "application/json" } });
  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`JustOneAPI TikTok Shop failed (${response.status}): ${rawText}`);
  }

  const data = JSON.parse(rawText) as {
    code?: number;
    message?: string;
    data?: {
      products?: Array<Record<string, unknown>>;
      product_list?: Array<Record<string, unknown>>;
      items?: Array<Record<string, unknown>>;
    };
    products?: Array<Record<string, unknown>>;
  };

  if (data.code !== undefined && data.code !== 0) {
    throw new Error(`JustOneAPI TikTok Shop error (${data.code}): ${data.message ?? "unknown"}`);
  }

  const items =
    data.data?.products ??
    data.data?.product_list ??
    data.data?.items ??
    data.products ??
    [];
  return items.slice(0, 20).map((p) => mapTikTokProduct(p, region, mapping.currency));
}

function mapTikTokProduct(
  raw: Record<string, unknown>,
  region?: RegionCode,
  currency = "USD"
): ProductSearchResult {
  const id = pickString(raw, ["id", "product_id", "productId", "asin"]) ?? crypto.randomUUID();
  const title =
    pickString(raw, ["title", "product_title", "name", "product_name"]) ??
    "TikTok Shop product";

  const price =
    pickNumber(raw, ["price", "sale_price", "min_price"]) ??
    pickNestedNumber(raw, ["price", "amount"]) ??
    pickNestedNumber(raw, ["price_info", "price"]) ??
    parsePriceString(pickString(raw, ["price_str", "price_string"]));

  const image =
    pickString(raw, ["image", "thumbnail", "cover", "main_image_url"]) ??
    pickNestedString(raw, ["main_image", "url"]) ??
    pickNestedString(raw, ["image", "url"]) ??
    null;

  const rating =
    pickNumber(raw, ["rating", "product_rating", "score"]) ??
    pickNestedNumber(raw, ["rating_info", "rating"]) ??
    null;

  const sourceUrl =
    pickString(raw, ["url", "link", "product_url", "detail_url", "pdp_url"]) ?? null;

  const supplier =
    pickString(raw, ["seller_name", "shop_name", "store_name", "source"]) ??
    "TikTok Shop";

  const sales = pickNumber(raw, ["sold_count", "sales", "sold"]);
  const commission = pickNumber(raw, ["commission_rate", "commission"]);

  return {
    id,
    title,
    price: price ?? 0,
    platform: "tiktok",
    image,
    shippingDays: null,
    supplier: commission
      ? `${supplier} (${commission}% commission)`
      : sales
        ? `${supplier} (${sales} sold)`
        : supplier,
    rating,
    sourceUrl,
    currency,
    region,
    shipFrom: resolveRegion(region).defaultShipFrom,
    trendScore: sales && sales > 1000 ? 85 : sales && sales > 100 ? 70 : 55,
    isTrending: (sales ?? 0) > 500,
  };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function pickNestedString(obj: Record<string, unknown>, path: [string, string]): string | undefined {
  const parent = obj[path[0]];
  if (parent && typeof parent === "object" && !Array.isArray(parent)) {
    const value = (parent as Record<string, unknown>)[path[1]];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function pickNestedNumber(obj: Record<string, unknown>, path: [string, string]): number | null {
  const parent = obj[path[0]];
  if (parent && typeof parent === "object" && !Array.isArray(parent)) {
    return pickNumber(parent as Record<string, unknown>, [path[1]]);
  }
  return null;
}

function parsePriceString(value?: string): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}
