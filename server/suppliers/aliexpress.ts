import type { ProductOffer, RegionCode } from "@shared/searchTypes";
import { ENV, isAliExpressConfigured } from "../_core/env";
import { resolveRegion } from "../search/regions";
import { signAliExpressParams } from "./signing";

const AE_API_BASE = "https://api-sg.aliexpress.com/sync";

export function isAliExpressApiConfigured() {
  return isAliExpressConfigured();
}

export async function searchAliExpressOffers(
  title: string,
  region?: RegionCode
): Promise<{ offers: ProductOffer[]; live: boolean; error?: string }> {
  if (!isAliExpressApiConfigured()) {
    return { offers: getAliExpressMockOffers(title, region), live: false };
  }

  try {
    const params: Record<string, string> = {
      app_key: ENV.aliexpressAppKey,
      method: "aliexpress.affiliate.product.query",
      sign_method: "md5",
      timestamp: String(Date.now()),
      format: "json",
      v: "2.0",
      keywords: title,
      page_size: "10",
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
        offers: getAliExpressMockOffers(title, region),
        live: false,
        error: `AliExpress API error (${response.status})`,
      };
    }

    const data = (await response.json()) as {
      error_response?: { msg?: string; sub_msg?: string };
      aliexpress_affiliate_product_query_response?: {
        resp_result?: {
          result?: { products?: { product?: Array<Record<string, unknown>> } };
        };
      };
    };

    if (data.error_response) {
      const msg = data.error_response.sub_msg ?? data.error_response.msg ?? "Unknown error";
      console.warn("[AliExpress] API returned error:", msg);
      return {
        offers: getAliExpressMockOffers(title, region),
        live: false,
        error: msg,
      };
    }

    const products =
      data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products
        ?.product ?? [];

    if (products.length === 0) {
      return { offers: getAliExpressMockOffers(title, region), live: false };
    }

    const mapping = resolveRegion(region);
    const offers = products.slice(0, 5).map((item, i) => {
      const price = Number(item.target_sale_price ?? item.sale_price ?? 8);
      const shipping = Number(item.shipping_fee ?? 2.5);
      const shipFrom = ENV.aliexpressShipFromDefault as ProductOffer["shipFrom"];
      return {
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
        shippingDaysMin: Number(item.delivery_days_min ?? 12),
        shippingDaysMax: Number(item.delivery_days_max ?? 25),
        currency: mapping.currency,
        landedCost: price + shipping,
      };
    });

    return { offers, live: true };
  } catch (err) {
    console.warn("[AliExpress] fetch failed:", err);
    return {
      offers: getAliExpressMockOffers(title, region),
      live: false,
      error: "AliExpress request failed",
    };
  }
}

function getAliExpressMockOffers(title: string, region?: RegionCode): ProductOffer[] {
  const mapping = resolveRegion(region);
  const base = 6 + (title.length % 8);
  return [
    {
      id: "ae-mock-1",
      productTitle: `${title} — AliExpress CN`,
      supplierPlatform: "aliexpress",
      supplierSku: "AE-123456",
      warehouse: "CN",
      shipFrom: "CN",
      unitCost: base,
      shippingCost: 1.99,
      moq: 1,
      processingDays: 2,
      shippingDaysMin: 15,
      shippingDaysMax: 30,
      currency: mapping.currency,
      landedCost: base + 1.99,
      isDemo: true,
    },
    {
      id: "ae-mock-2",
      productTitle: `${title} — AliExpress EU Warehouse`,
      supplierPlatform: "aliexpress",
      supplierSku: "AE-789012",
      warehouse: "EU",
      shipFrom: "EU",
      unitCost: base + 4,
      shippingCost: 3.5,
      moq: 1,
      processingDays: 1,
      shippingDaysMin: 5,
      shippingDaysMax: 10,
      currency: mapping.currency,
      landedCost: base + 7.5,
      isDemo: true,
    },
  ];
}
