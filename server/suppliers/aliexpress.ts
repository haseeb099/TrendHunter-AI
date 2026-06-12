import type { ProductOffer, RegionCode } from "@shared/searchTypes";
import { ENV, isAliExpressConfigured } from "../_core/env";
import { resolveRegion } from "../search/regions";
import { getStrictTruthMode } from "../truthMode";
import { signAliExpressParams } from "./signing";

const PLACEHOLDER_STRINGS = new Set(["n/a", "na", "0.00", "0", "null", "undefined", "-"]);

function parseAeNumber(value: unknown, fallback: number, strictTruth: boolean): number | null {
  if (value == null) return strictTruth ? null : fallback;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (!s || PLACEHOLDER_STRINGS.has(s)) return strictTruth ? null : fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return strictTruth ? null : fallback;
  return n;
}

const AE_API_BASE = "https://api-sg.aliexpress.com/sync";

export function isAliExpressApiConfigured() {
  return isAliExpressConfigured();
}

export type AliExpressProductRow = Record<string, unknown>;

export async function queryAliExpressProducts(
  keywords: string,
  options?: { pageSize?: number; pageNo?: number }
): Promise<{ products: AliExpressProductRow[]; live: boolean; error?: string }> {
  if (!isAliExpressApiConfigured()) {
    return { products: [], live: false };
  }

  try {
    const params: Record<string, string> = {
      app_key: ENV.aliexpressAppKey,
      method: "aliexpress.affiliate.product.query",
      sign_method: "md5",
      timestamp: String(Date.now()),
      format: "json",
      v: "2.0",
      keywords,
      page_size: String(options?.pageSize ?? 10),
      page_no: String(options?.pageNo ?? 1),
    };

    if (ENV.aliexpressAccessToken) {
      params.session = ENV.aliexpressAccessToken;
    }

    params.sign = signAliExpressParams(params, ENV.aliexpressAppSecret);

    const response = await fetch(`${AE_API_BASE}?${new URLSearchParams(params)}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.warn("[AliExpress] API error:", response.status);
      return {
        products: [],
        live: false,
        error: `AliExpress API error (${response.status})`,
      };
    }

    const data = (await response.json()) as {
      error_response?: { msg?: string; sub_msg?: string };
      aliexpress_affiliate_product_query_response?: {
        resp_result?: {
          result?: { products?: { product?: AliExpressProductRow[] } };
        };
      };
    };

    if (data.error_response) {
      const msg = data.error_response.sub_msg ?? data.error_response.msg ?? "Unknown error";
      console.warn("[AliExpress] API returned error:", msg);
      return {
        products: [],
        live: false,
        error: msg,
      };
    }

    const products =
      data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products
        ?.product ?? [];

    return { products, live: products.length > 0 };
  } catch (err) {
    console.warn("[AliExpress] fetch failed:", err);
    return {
      products: [],
      live: false,
      error: "AliExpress request failed",
    };
  }
}

export async function searchAliExpressOffers(
  title: string,
  region?: RegionCode
): Promise<{ offers: ProductOffer[]; live: boolean; error?: string }> {
  const { products, live, error } = await queryAliExpressProducts(title, { pageSize: 10, pageNo: 1 });

  if (!live || products.length === 0) {
    return { offers: [], live: false, error };
  }

  const mapping = resolveRegion(region);
  const strictTruth = await getStrictTruthMode();
  const offers: ProductOffer[] = [];

  const slice = products.slice(0, 5);
  for (let i = 0; i < slice.length; i += 1) {
    const item = slice[i]!;
    const price = parseAeNumber(item.target_sale_price ?? item.sale_price, 8, strictTruth);
    const shipping = parseAeNumber(item.shipping_fee, 2.5, strictTruth);
    if (price == null || shipping == null) continue;

    const shipFrom = ENV.aliexpressShipFromDefault as ProductOffer["shipFrom"];
    const daysMin = parseAeNumber(item.delivery_days_min, 12, strictTruth);
    const daysMax = parseAeNumber(item.delivery_days_max, 25, strictTruth);

    offers.push({
      id: `ae-${item.product_id ?? i}`,
      productTitle: String(item.product_title ?? title),
      supplierPlatform: "aliexpress" as const,
      supplierSku: String(item.product_id ?? ""),
      warehouse: shipFrom,
      shipFrom,
      unitCost: price,
      shippingCost: shipping,
      moq: 1,
      processingDays: 3,
      shippingDaysMin: daysMin ?? undefined,
      shippingDaysMax: daysMax ?? undefined,
      currency: mapping.currency,
      landedCost: price + shipping,
    });
  }

  return { offers, live: offers.length > 0 };
}
