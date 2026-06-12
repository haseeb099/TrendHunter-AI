import type { ProductOffer, RegionCode } from "@shared/searchTypes";
import { ENV, isCjConfigured } from "../_core/env";
import {
  assertProviderBudget,
  ProviderBudgetExhaustedError,
  recordProviderApiCall,
} from "../dataPlatform/providerBudget";
import { resolveRegion } from "../search/regions";

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export function isCjApiConfigured() {
  return isCjConfigured();
}

async function getCjAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  try {
    const response = await fetch(`${ENV.cjApiBase}/authentication/getAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: ENV.cjApiKey }),
    });

    if (!response.ok) {
      console.warn("[CJ] Token exchange failed:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      data?: { accessToken?: string; expireIn?: number; accessTokenExpiryDate?: string };
      result?: boolean;
      success?: boolean;
    };

    const token = data.data?.accessToken;
    if (!token) return null;

    cachedAccessToken = token;
    const expiry = data.data?.accessTokenExpiryDate
      ? Date.parse(data.data.accessTokenExpiryDate)
      : NaN;
    const ttlSec = data.data?.expireIn ?? 3600;
    tokenExpiresAt =
      Number.isFinite(expiry) && expiry > Date.now()
        ? expiry - 60_000
        : Date.now() + ttlSec * 1000 - 60_000;
    return token;
  } catch (err) {
    console.warn("[CJ] Token fetch error:", err);
    return null;
  }
}

export async function queryCjProducts(
  title: string,
  options?: {
    pageSize?: number;
    pageNum?: number;
    region?: RegionCode;
    countryCode?: string;
    ingest?: boolean;
  }
): Promise<{ products: Array<Record<string, unknown>>; live: boolean; error?: string }> {
  if (!isCjApiConfigured()) {
    return { products: [], live: false };
  }

  try {
    await assertProviderBudget("cj", { ingest: options?.ingest });
  } catch (err) {
    if (err instanceof ProviderBudgetExhaustedError) {
      return { products: [], live: false, error: err.message };
    }
    throw err;
  }

  const token = await getCjAccessToken();
  if (!token) {
    return {
      products: [],
      live: false,
      error: "CJ token exchange failed",
    };
  }

  try {
    const mapping = resolveRegion(options?.region);
    const countryCode = options?.countryCode ?? mapping.cjCountryCode;
    const listUrl = new URL(`${ENV.cjApiBase}/product/list`);
    listUrl.searchParams.set("productNameEn", title);
    listUrl.searchParams.set("pageNum", String(options?.pageNum ?? 1));
    listUrl.searchParams.set("pageSize", String(options?.pageSize ?? 10));
    if (countryCode) {
      listUrl.searchParams.set("countryCode", countryCode);
    }

    const response = await fetch(listUrl, {
      method: "GET",
      headers: {
        "CJ-Access-Token": token,
      },
    });

    const rawText = await response.text();
    if (!response.ok) {
      console.warn("[CJ] API error:", response.status, rawText);
      return {
        products: [],
        live: false,
        error: `CJ API error (${response.status})`,
      };
    }

    const data = JSON.parse(rawText) as {
      code?: number;
      success?: boolean;
      message?: string;
      data?: { list?: Array<Record<string, unknown>> };
    };

    if (data.success === false || (data.code !== undefined && data.code !== 200)) {
      console.warn("[CJ] API business error:", data.message ?? data.code);
      return {
        products: [],
        live: false,
        error: data.message ?? `CJ API error (${data.code})`,
      };
    }

    const items = data.data?.list ?? [];
    if (items.length === 0) {
      return { products: [], live: false };
    }

    await recordProviderApiCall("cj");
    return { products: items, live: true };
  } catch (err) {
    console.warn("[CJ] fetch failed:", err);
    return {
      products: [],
      live: false,
      error: "CJ request failed",
    };
  }
}

export async function searchCjOffers(
  title: string,
  region?: RegionCode
): Promise<{ offers: ProductOffer[]; live: boolean; error?: string }> {
  const { products, live, error } = await queryCjProducts(title, {
    pageSize: 10,
    pageNum: 1,
    region,
  });

  if (!live) {
    return { offers: [], live: false, error };
  }

  if (products.length === 0) {
    return { offers: [], live: false };
  }

  try {
    const mapping = resolveRegion(region);
    const offers = products.slice(0, 5).map((item, i) => {
      const sellPrice = Number(item.sellPrice ?? item.productPrice ?? 10);
      const shipping = Number(item.postage ?? item.shippingCost ?? 3);
      const warehouse = String(item.warehouse ?? ENV.cjDefaultWarehouse ?? mapping.defaultShipFrom);
      return {
        id: `cj-${item.pid ?? i}`,
        productTitle: String(item.productNameEn ?? title),
        supplierPlatform: "cj" as const,
        supplierSku: String(item.productSku ?? item.pid ?? ""),
        warehouse,
        shipFrom: (warehouse === "US" || warehouse === "UK" || warehouse === "CN" || warehouse === "EU"
          ? warehouse
          : mapping.defaultShipFrom) as ProductOffer["shipFrom"],
        unitCost: sellPrice,
        shippingCost: shipping,
        moq: Number(item.moq ?? 1),
        processingDays: Number(item.processingTime ?? item.processingDays ?? 2),
        shippingDaysMin: Number(item.deliveryTimeMin ?? 5),
        shippingDaysMax: Number(item.deliveryTimeMax ?? 12),
        currency: mapping.currency,
        landedCost: sellPrice + shipping,
      };
    });

    return { offers, live: true };
  } catch (err) {
    console.warn("[CJ] offer mapping failed:", err);
    return {
      offers: [],
      live: false,
      error: "CJ offer mapping failed",
    };
  }
}
