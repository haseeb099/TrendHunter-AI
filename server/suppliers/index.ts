import type { ProductOffer, ProductOffersResponse, RegionCode } from "@shared/searchTypes";
import { isCjApiConfigured, searchCjOffers } from "./cj";
import { isAliExpressApiConfigured, searchAliExpressOffers } from "./aliexpress";
import { cacheProductOffers, getCachedProductOffers } from "../db";
import { ENV } from "../_core/env";

const OFFERS_CACHE_TTL_MS = ENV.offersCacheTtlHours * 60 * 60 * 1000;

export type SupplierConfidenceTier = "high" | "medium" | "low";

export type OffersStatus = {
  cj: { configured: boolean; mode: "live" | "off" };
  aliexpress: { configured: boolean; mode: "live" | "off" };
};

export function computeSupplierConfidenceTier(
  offers: ProductOffer[]
): SupplierConfidenceTier {
  if (offers.length === 0) return "low";
  const suppliers = new Set(offers.map((o) => o.supplierPlatform));
  const bestShip = Math.min(
    ...offers.map((o) => o.shippingDaysMax ?? o.shippingDaysMin ?? 30)
  );
  if (suppliers.size >= 2 && bestShip < 10) return "high";
  if (offers.length >= 1) return "medium";
  return "low";
}

export function getOffersStatus(): OffersStatus {
  return {
    cj: {
      configured: isCjApiConfigured(),
      mode: isCjApiConfigured() ? "live" : "off",
    },
    aliexpress: {
      configured: isAliExpressApiConfigured(),
      mode: isAliExpressApiConfigured() ? "live" : "off",
    },
  };
}

export async function getOffersForProduct(options: {
  productId?: string;
  title: string;
  region?: RegionCode;
  forceRefresh?: boolean;
}): Promise<ProductOffersResponse> {
  const { productId, title, region, forceRefresh } = options;
  const status = getOffersStatus();
  const suppliersConfigured = status.cj.configured || status.aliexpress.configured;

  if (!forceRefresh) {
    const cached = await getCachedProductOffers({
      productId,
      title,
      maxAgeMs: OFFERS_CACHE_TTL_MS,
    });
    if (cached.offers.length > 0) {
      return {
        offers: cached.offers.sort((a, b) => a.landedCost - b.landedCost),
        dataMode: "cached",
        cachedAt: cached.fetchedAt ?? undefined,
        stale: cached.stale,
      };
    }
  }

  if (!suppliersConfigured) {
    return { offers: [], dataMode: "cached", stale: false };
  }

  const [cjResult, aeResult] = await Promise.all([
    searchCjOffers(title, region),
    searchAliExpressOffers(title, region),
  ]);

  const warnings: string[] = [];
  if (cjResult.error) warnings.push(cjResult.error);
  if (aeResult.error) warnings.push(aeResult.error);

  const offers = [...cjResult.offers, ...aeResult.offers].map((offer) => ({
    ...offer,
    productId: productId ?? offer.productId,
    productTitle: offer.productTitle || title,
  }));

  const fetchedAt = new Date().toISOString();

  if (offers.length > 0) {
    await cacheProductOffers(
      offers.map((o) => ({
        productId: productId ?? null,
        productTitle: o.productTitle,
        supplierPlatform: o.supplierPlatform,
        supplierSku: o.supplierSku ?? null,
        warehouse: o.warehouse ?? null,
        shipFrom: o.shipFrom,
        unitCost: o.unitCost,
        shippingCost: o.shippingCost,
        moq: o.moq,
        processingDays: o.processingDays ?? null,
        shippingDaysMin: o.shippingDaysMin ?? null,
        shippingDaysMax: o.shippingDaysMax ?? null,
        currency: o.currency,
        raw: { ...o, warnings: warnings.length > 0 ? warnings : undefined },
      }))
    );
  }

  return {
    offers: offers.sort((a, b) => a.landedCost - b.landedCost),
    dataMode: "live",
    cachedAt: fetchedAt,
    stale: false,
  };
}
