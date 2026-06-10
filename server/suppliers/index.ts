import type { ProductOffer, RegionCode } from "@shared/searchTypes";
import { isCjApiConfigured, searchCjOffers } from "./cj";
import { isAliExpressApiConfigured, searchAliExpressOffers } from "./aliexpress";
import { cacheProductOffers, getCachedProductOffers } from "../db";
import { ENV } from "../_core/env";

const OFFERS_CACHE_TTL_MS = ENV.offersCacheTtlHours * 60 * 60 * 1000;

export type OffersStatus = {
  cj: { configured: boolean; mode: "live" | "demo" };
  aliexpress: { configured: boolean; mode: "live" | "demo" };
};

export function getOffersStatus(): OffersStatus {
  return {
    cj: {
      configured: isCjApiConfigured(),
      mode: isCjApiConfigured() ? "live" : "demo",
    },
    aliexpress: {
      configured: isAliExpressApiConfigured(),
      mode: isAliExpressApiConfigured() ? "live" : "demo",
    },
  };
}

export async function getOffersForProduct(options: {
  productId?: string;
  title: string;
  region?: RegionCode;
  forceRefresh?: boolean;
}): Promise<ProductOffer[]> {
  const { productId, title, region, forceRefresh } = options;

  if (!forceRefresh) {
    const cached = await getCachedProductOffers({
      productId,
      title,
      maxAgeMs: OFFERS_CACHE_TTL_MS,
    });
    if (cached.length > 0) {
      return cached.sort((a, b) => a.landedCost - b.landedCost);
    }
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

  return offers.sort((a, b) => a.landedCost - b.landedCost);
}
