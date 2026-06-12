import type {

  ProductSearchResult,

  RegionCode,

  ShipFromCode,

  TrendScoreInputs,

} from "@shared/searchTypes";

import { inferCategoryFromTitle } from "./categories";

import { mapMarketplaceCategory } from "./categoryTaxonomy";

export { mapMarketplaceCategory } from "./categoryTaxonomy";

import { resolveRegion } from "./regions";



type RawProduct = Omit<Partial<ProductSearchResult>, "price"> & {
  title: string;
  price: number | string;
  platform: string;
};

const PLACEHOLDER_STRINGS = new Set(["n/a", "na", "0.00", "0", "null", "undefined", "-"]);

function isPlaceholderString(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return PLACEHOLDER_STRINGS.has(s) || s.length === 0;
  }
  return false;
}

function coerceStrictPrice(value: unknown, strictTruth: boolean): number | null {
  if (isPlaceholderString(value)) {
    return strictTruth ? null : 0;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return strictTruth ? null : 0;
  }
  return n;
}



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

  const numericPrice = typeof item.price === "number" ? item.price : Number(item.price);

  if (Number.isFinite(numericPrice) && numericPrice > 0 && numericPrice < 30) priceBoost = 10;

  if (item.isTrending) trendingFlag = 20;



  const score = Math.min(100, baseScore + ratingBoost + shippingBoost + priceBoost + trendingFlag);

  return {

    score,

    inputs: { baseScore, ratingBoost, shippingBoost, priceBoost, trendingFlag },

  };

}



export function normalizeProduct(

  raw: RawProduct,

  region?: RegionCode,

  options?: { allowHeuristicScores?: boolean; strictTruth?: boolean }

): ProductSearchResult | null {

  const mapping = resolveRegion(region);

  const shipFrom = (raw.shipFrom ?? mapping.defaultShipFrom) as ShipFromCode;

  const allowHeuristic = options?.allowHeuristicScores ?? false;

  const strictTruth = options?.strictTruth ?? false;

  const price = coerceStrictPrice(raw.price, strictTruth);

  if (price == null) return null;



  const taxonomy =

    raw.category != null

      ? {

          category: raw.category,

          subcategory: raw.subcategory,

          productType: raw.productType,

          categoryInferred: raw.categoryInferred ?? false,

        }

      : mapMarketplaceCategory(raw.category, raw.platform, raw.title);



  let trendScore: number | null | undefined = raw.trendScore ?? null;

  let trendScoreInputs: TrendScoreInputs | undefined = raw.trendScoreInputs;

  let isTrending: boolean | null = raw.isTrending ?? null;



  if (trendScore == null && allowHeuristic) {

    const inferred = inferTrendScore(raw);

    trendScore = inferred.score;

    trendScoreInputs = trendScoreInputs ?? inferred.inputs;

    if (isTrending == null) {

      isTrending = inferred.score >= 70 ? true : null;

    }

  } else if (trendScore != null && isTrending == null) {

    isTrending = trendScore >= 70 ? true : null;

  }



  return {

    id: raw.id ?? crypto.randomUUID(),

    title: raw.title,

    price,

    platform: raw.platform,

    image: raw.image ?? null,

    shippingDays: raw.shippingDays ?? null,

    supplier: raw.supplier ?? null,

    rating: raw.rating ?? null,

    sourceUrl: raw.sourceUrl ?? null,

    region: region,

    currency: raw.currency ?? mapping.currency,

    category: taxonomy.category ?? inferCategoryFromTitle(raw.title),

    subcategory: taxonomy.subcategory ?? raw.subcategory,

    productType: taxonomy.productType ?? raw.productType,

    taxonomyId: taxonomy.taxonomyId,

    categoryInferred: taxonomy.categoryInferred,

    shipFrom,

    warehouse: raw.warehouse ?? shipFrom,

    trendScore: trendScore ?? undefined,

    trendScoreInputs,

    moq: raw.moq,

    isTrending,

    sourceProvider: raw.sourceProvider,

    listingFetchedAt: raw.listingFetchedAt ?? new Date().toISOString(),

    canonicalProductId: raw.canonicalProductId,

    alsoListedOn: raw.alsoListedOn,

  };

}



export function normalizeProducts(

  items: RawProduct[],

  region?: RegionCode,

  options?: { allowHeuristicScores?: boolean; strictTruth?: boolean }

): ProductSearchResult[] {

  return items

    .map((item) => normalizeProduct(item, region, options))

    .filter((item): item is ProductSearchResult => item != null);

}


