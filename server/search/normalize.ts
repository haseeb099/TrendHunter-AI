import type {
  ProductSearchResult,
  RegionCode,
  ShipFromCode,
  TrendScoreInputs,
} from "@shared/searchTypes";
import { inferCategoryFromTitle } from "./categories";
import { resolveRegion } from "./regions";

type RawProduct = Partial<ProductSearchResult> & {
  title: string;
  price: number;
  platform: string;
};

export function inferTrendScore(item: RawProduct): { score: number; inputs: TrendScoreInputs } {
  const baseScore = 50;
  let ratingBoost = 0;
  let shippingBoost = 0;
  let priceBoost = 0;
  let trendingFlag = 0;

  if (item.rating && item.rating >= 4.5) ratingBoost = 15;
  else if (item.rating && item.rating >= 4.0) ratingBoost = 8;
  if (item.shippingDays !== null && item.shippingDays !== undefined && item.shippingDays <= 5) {
    shippingBoost = 10;
  }
  if (item.price > 0 && item.price < 30) priceBoost = 10;
  if (item.isTrending) trendingFlag = 20;

  const score = Math.min(100, baseScore + ratingBoost + shippingBoost + priceBoost + trendingFlag);
  return {
    score,
    inputs: { baseScore, ratingBoost, shippingBoost, priceBoost, trendingFlag },
  };
}

export function normalizeProduct(
  raw: RawProduct,
  region?: RegionCode
): ProductSearchResult {
  const mapping = resolveRegion(region);
  const shipFrom = (raw.shipFrom ?? mapping.defaultShipFrom) as ShipFromCode;

  const inferred =
    raw.trendScore != null
      ? {
          score: raw.trendScore,
          inputs:
            raw.trendScoreInputs ??
            ({
              baseScore: raw.trendScore,
              ratingBoost: 0,
              shippingBoost: 0,
              priceBoost: 0,
              trendingFlag: 0,
            } satisfies TrendScoreInputs),
        }
      : inferTrendScore(raw);

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
    trendScore: inferred.score,
    trendScoreInputs: raw.trendScoreInputs ?? inferred.inputs,
    moq: raw.moq,
    isTrending: raw.isTrending ?? inferred.score >= 70,
  };
}

export function normalizeProducts(
  items: RawProduct[],
  region?: RegionCode
): ProductSearchResult[] {
  return items.map((item) => normalizeProduct(item, region));
}
