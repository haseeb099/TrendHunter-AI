import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { resolveRegion } from "./regions";

let cachedToken: { value: string; expiresAt: number } | null = null;

function ebayApiBase() {
  return ENV.ebayEnv === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
}

async function getEbayAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${ENV.ebayClientId}:${ENV.ebayClientSecret}`).toString(
    "base64"
  );

  const response = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay auth failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export function isEbayConfigured() {
  return Boolean(ENV.ebayClientId && ENV.ebayClientSecret);
}

export async function searchEbay(
  query: string,
  region?: RegionCode
): Promise<ProductSearchResult[]> {
  if (!isEbayConfigured()) return [];

  const mapping = resolveRegion(region);
  const token = await getEbayAccessToken();
  const params = new URLSearchParams({
    q: query,
    limit: "20",
  });

  const response = await fetch(
    `${ebayApiBase()}/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": mapping.ebayMarketplaceId,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay search failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    itemSummaries?: Array<{
      itemId?: string;
      title?: string;
      price?: { value?: string; currency?: string };
      image?: { imageUrl?: string };
      itemWebUrl?: string;
      seller?: { username?: string };
      shippingOptions?: Array<{ maxEstimatedDeliveryDate?: string }>;
    }>;
  };

  return (data.itemSummaries ?? []).map((item) => ({
    id: item.itemId ?? crypto.randomUUID(),
    title: item.title ?? "Untitled listing",
    price: Number.parseFloat(item.price?.value ?? "0") || 0,
    platform: "ebay",
    image: item.image?.imageUrl ?? null,
    shippingDays: estimateShippingDays(item.shippingOptions?.[0]?.maxEstimatedDeliveryDate),
    supplier: item.seller?.username ?? "eBay seller",
    rating: null,
    sourceUrl: item.itemWebUrl ?? null,
    currency: item.price?.currency ?? mapping.currency,
    region,
    shipFrom: mapping.defaultShipFrom,
    warehouse: mapping.defaultShipFrom,
  }));
}

function estimateShippingDays(maxDeliveryDate?: string): number | null {
  if (!maxDeliveryDate) return null;
  const delivery = new Date(maxDeliveryDate);
  if (Number.isNaN(delivery.getTime())) return null;
  const diffMs = delivery.getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
