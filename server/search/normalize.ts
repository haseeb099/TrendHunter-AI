import type { ProductSearchResult, RegionCode, ShipFromCode } from "@shared/searchTypes";
import { inferCategoryFromTitle } from "./categories";
import { resolveRegion } from "./regions";

type RawProduct = Partial<ProductSearchResult> & {
  title: string;
  price: number;
  platform: string;
};

function inferTrendScore(item: RawProduct): number {
  let score = 50;
  if (item.rating && item.rating >= 4.5) score += 15;
  if (item.rating && item.rating >= 4.0) score += 8;
  if (item.shippingDays !== null && item.shippingDays !== undefined && item.shippingDays <= 5) score += 10;
  if (item.price > 0 && item.price < 30) score += 10;
  if (item.isTrending) score += 20;
  return Math.min(100, score);
}

export function normalizeProduct(
  raw: RawProduct,
  region?: RegionCode
): ProductSearchResult {
  const mapping = resolveRegion(region);
  const shipFrom = (raw.shipFrom ?? mapping.defaultShipFrom) as ShipFromCode;

  return {
    id: raw.id ?? crypto.randomUUID(),
    title: raw.title,
    price: raw.price,
    platform: raw.platform,
    image: raw.image ?? null,
    shippingDays: raw.shippingDays ?? null,
    supplier: raw.supplier ?? null,
    rating: raw.rating ?? null,
    sourceUrl: raw.sourceUrl ?? null,
    region: region,
    currency: raw.currency ?? mapping.currency,
    category: raw.category ?? inferCategoryFromTitle(raw.title),
    shipFrom,
    warehouse: raw.warehouse ?? shipFrom,
    trendScore: raw.trendScore ?? inferTrendScore(raw),
    moq: raw.moq,
    isTrending: raw.isTrending ?? (raw.trendScore ?? 0) >= 70,
  };
}

export function normalizeProducts(
  items: RawProduct[],
  region?: RegionCode
): ProductSearchResult[] {
  return items.map((item) => normalizeProduct(item, region));
}
