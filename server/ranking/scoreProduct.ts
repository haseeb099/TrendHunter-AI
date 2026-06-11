import type {
  ProductSearchResult,
  RankingExplanation,
  RegionCode,
  TrendScoreInputs,
} from "@shared/searchTypes";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { rankingConfigs } from "../../drizzle/schema";
import { getAdLibrarySnapshot } from "../intelligence/adLibrary";
import { getTikTokAdsSnapshot } from "../intelligence/tiktokAds";
import { getTrendSignal } from "../intelligence/trends";
import { inferTrendScore } from "../search/normalize";
import { linkKeywordFromTitle } from "../discovery/keywordLinker";
import { getProductFeatures, materializeProductFeatures } from "./features";
import { inferCategoryFromTitle } from "../search/categories";
import { getDb } from "../db";

export const RANKING_VERSION = "v2";

export const DEFAULT_WEIGHTS = {
  trendMomentum: 0.18,
  demandPersistence: 0.08,
  metaAdSaturation: 0.14,
  tiktokPressure: 0.1,
  marginSpread: 0.14,
  supplierConfidence: 0.1,
  competitionIntensity: 0.06,
  freshnessDecay: 0.1,
  queryIntentMatch: 0.05,
  returnRisk: 0.05,
} as const;

export type RankingWeights = { [K in keyof typeof DEFAULT_WEIGHTS]: number };

export const RANKING_WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS) as Array<keyof RankingWeights>;

export async function loadActiveRankingWeights(
  region: RegionCode,
  version: string = RANKING_VERSION
): Promise<RankingWeights> {
  const db = await getDb();
  if (!db) return { ...DEFAULT_WEIGHTS };

  const rows = await db
    .select()
    .from(rankingConfigs)
    .where(
      and(
        eq(rankingConfigs.isActive, true),
        eq(rankingConfigs.version, version),
        or(isNull(rankingConfigs.region), eq(rankingConfigs.region, region))
      )
    )
    .orderBy(desc(rankingConfigs.updatedAt));

  const regional = rows.find((row) => row.region === region);
  const global = rows.find((row) => row.region == null);
  const chosen = regional ?? global;
  if (!chosen?.weights || typeof chosen.weights !== "object") {
    return { ...DEFAULT_WEIGHTS };
  }

  const stored = chosen.weights as Partial<RankingWeights>;
  return { ...DEFAULT_WEIGHTS, ...stored };
}

function weightSum(weights: RankingWeights): number {
  return RANKING_WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

const RETURN_RISK: Record<string, number> = {
  fashion: 0.8,
  electronics: 0.5,
  home: 0.3,
  beauty: 0.4,
  sports: 0.45,
  toys: 0.35,
  automotive: 0.3,
  pet: 0.35,
};

function adOpportunityScore(activeAdCount: number | null | undefined): number {
  if (activeAdCount == null) return 50;
  if (activeAdCount === 0) return 90;
  if (activeAdCount < 5) return 80;
  if (activeAdCount < 20) return 60;
  if (activeAdCount < 50) return 40;
  return 25;
}

function tiktokOpportunityScore(activeAdCount: number | null | undefined): number {
  if (activeAdCount == null) return 50;
  if (activeAdCount < 3) return 85;
  if (activeAdCount < 10) return 65;
  if (activeAdCount < 30) return 45;
  return 30;
}

function marginScore(price: number, landedCost?: number): number {
  if (!landedCost || landedCost <= 0 || price <= 0) return marginHintScore(price);
  const margin = (price - landedCost) / price;
  if (margin >= 0.5) return 90;
  if (margin >= 0.35) return 75;
  if (margin >= 0.2) return 60;
  return 40;
}

function marginHintScore(price: number): number {
  if (price <= 0) return 50;
  if (price >= 15 && price <= 45) return 75;
  if (price >= 10 && price <= 60) return 65;
  if (price < 10) return 45;
  return 40;
}

function supplierScore(product: ProductSearchResult): number {
  let score = 45;
  if (product.rating && product.rating >= 4.5) score += 25;
  else if (product.rating && product.rating >= 4.0) score += 15;
  if (product.supplier) score += 10;
  if (product.shippingDays !== null && product.shippingDays <= 7) score += 10;
  return Math.min(100, score);
}

function freshnessScore(listingFetchedAt?: string): number {
  if (!listingFetchedAt) return 50;
  const ageHours = (Date.now() - new Date(listingFetchedAt).getTime()) / (1000 * 60 * 60);
  return Math.round(100 * Math.exp(-ageHours / 48));
}

function queryIntentScore(query: string | undefined, title: string): number {
  if (!query) return 50;
  const qTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
  const tTokens = title.toLowerCase().split(/\s+/).filter(Boolean);
  if (qTokens.size === 0) return 50;
  const hits = tTokens.filter((t) => qTokens.has(t)).length;
  return Math.min(100, Math.round((hits / qTokens.size) * 100));
}

function returnRiskScore(product: ProductSearchResult): number {
  const category = product.category ?? inferCategoryFromTitle(product.title) ?? "home";
  const risk = RETURN_RISK[category] ?? 0.4;
  const pricePenalty = product.price < 15 ? 0.15 : 0;
  return Math.round(100 * (1 - risk - pricePenalty));
}

function competitionScore(listingCount?: number): number {
  if (!listingCount || listingCount <= 1) return 80;
  if (listingCount <= 3) return 65;
  if (listingCount <= 6) return 50;
  return 30;
}

const PRESSURE_SIGNAL_NAMES = [
  "Meta ad saturation",
  "Competition intensity",
  "TikTok creative pressure",
] as const;

function buildExplanation(
  signals: Array<{ name: string; score: number; weight: number }>,
  confidence: RankingExplanation["confidence"],
  staleFeatures?: boolean
): RankingExplanation {
  const withContribution = signals.map((s) => ({
    ...s,
    contribution: Math.round(s.score * s.weight * 10) / 10,
  }));
  const byContribution = [...withContribution].sort((a, b) => b.contribution - a.contribution);
  const used = new Set<string>();
  const topSignals: typeof withContribution = [];

  for (const signal of byContribution) {
    if (topSignals.length >= 3) break;
    topSignals.push(signal);
    used.add(signal.name);
  }

  const pressureSignal = withContribution
    .filter(
      (s) =>
        (PRESSURE_SIGNAL_NAMES as readonly string[]).includes(s.name) && s.score < 40 && !used.has(s.name)
    )
    .sort((a, b) => a.score - b.score)[0];
  if (pressureSignal) {
    topSignals.push(pressureSignal);
    used.add(pressureSignal.name);
  }

  for (const signal of byContribution) {
    if (topSignals.length >= 4) break;
    if (!used.has(signal.name)) {
      topSignals.push(signal);
      used.add(signal.name);
    }
  }

  const top = topSignals[0];
  let summary = "Moderate opportunity based on available signals.";
  if (top) {
    if (top.name === "Trend momentum" && top.score >= 70) {
      summary = "Rising search interest with balanced competition signals.";
    } else if (top.name === "Meta ad saturation" && top.score >= 70) {
      summary = "Low Meta ad competition — good window to validate.";
    } else if (top.name === "TikTok creative pressure" && top.score >= 70) {
      summary = "Trending on TikTok with manageable creative pressure.";
    } else if (top.name === "Margin spread" && top.score >= 70) {
      summary = "Strong margin potential vs sourcing cost.";
    }
  }

  return {
    version: RANKING_VERSION,
    summary,
    topSignals,
    confidence,
    staleFeatures,
  };
}

export async function scoreProduct(
  product: ProductSearchResult,
  region: RegionCode,
  options?: {
    query?: string;
    forceTrending?: boolean;
    listingCount?: number;
    landedCost?: number;
  }
): Promise<ProductSearchResult> {
  const base = inferTrendScore({
    ...product,
    isTrending: options?.forceTrending ?? product.isTrending,
  });

  const canonicalId = product.canonicalProductId ?? product.id;
  let features = await getProductFeatures(canonicalId, region);
  const featureAge = features
    ? Date.now() - features.computedAt.getTime()
    : Number.POSITIVE_INFINITY;
  const staleFeatures = featureAge > 24 * 60 * 60 * 1000;

  const keyword =
    features?.keyword ?? (await linkKeywordFromTitle(product.title, region));

  let momentum = features?.momentumScore;
  let adSat = features?.adSaturationScore;
  let tiktokPressure = features?.tiktokPressureScore;
  let supplier = features?.supplierScore;
  let competition = features?.competitionScore;
  let freshness = features?.freshnessScore;

  if (!features || staleFeatures) {
    const [trend, ads, tiktok] = await Promise.all([
      getTrendSignal(keyword, region),
      getAdLibrarySnapshot(keyword, region),
      getTikTokAdsSnapshot(keyword, region),
    ]);

    momentum = trend?.momentumScore ?? base.score;
    adSat = adOpportunityScore(ads?.activeAdCount);
    tiktokPressure = tiktokOpportunityScore(tiktok?.activeAdCount);
    supplier = supplierScore(product);
    competition = competitionScore(options?.listingCount);
    freshness = freshnessScore(product.listingFetchedAt);

    await materializeProductFeatures({
      canonicalProductId: canonicalId,
      region,
      keyword,
      momentumScore: momentum ?? undefined,
      adSaturationScore: adSat ?? undefined,
      tiktokPressureScore: tiktokPressure ?? undefined,
      supplierScore: supplier ?? undefined,
      competitionScore: competition ?? undefined,
      freshnessScore: freshness ?? undefined,
    });
  }

  const demandPersistence = momentum ?? 50;
  const margin = marginScore(product.price, options?.landedCost);
  const intent = queryIntentScore(options?.query, product.title);
  const returnRisk = returnRiskScore(product);
  const weights = await loadActiveRankingWeights(region);

  const signals = [
    { name: "Trend momentum", score: momentum ?? 50, weight: weights.trendMomentum },
    { name: "Demand persistence", score: demandPersistence, weight: weights.demandPersistence },
    { name: "Meta ad saturation", score: adSat ?? 50, weight: weights.metaAdSaturation },
    { name: "TikTok creative pressure", score: tiktokPressure ?? 50, weight: weights.tiktokPressure },
    { name: "Margin spread", score: margin, weight: weights.marginSpread },
    { name: "Supplier confidence", score: supplier ?? 50, weight: weights.supplierConfidence },
    { name: "Competition intensity", score: competition ?? 50, weight: weights.competitionIntensity },
    { name: "Freshness", score: freshness ?? 50, weight: weights.freshnessDecay },
    { name: "Query intent match", score: intent, weight: weights.queryIntentMatch },
    { name: "Return risk", score: returnRisk, weight: weights.returnRisk },
  ];

  const totalWeight = weightSum(weights);
  const fused = Math.round(
    signals.reduce((sum, s) => sum + s.score * s.weight, 0) / (totalWeight > 0 ? totalWeight : 1)
  );
  const floor = options?.forceTrending ? 65 : 0;
  const trendScore = Math.min(100, Math.max(product.trendScore ?? 0, fused, floor));

  const confidence: RankingExplanation["confidence"] =
    staleFeatures ? "low" : signals.filter((s) => s.score > 0).length >= 6 ? "high" : "medium";

  const trendScoreInputs: TrendScoreInputs = {
    ...base.inputs,
    momentumScore: momentum ?? undefined,
    adSaturationScore: adSat ?? undefined,
    marginHint: margin,
    supplierConfidence: supplier ?? undefined,
  };

  return {
    ...product,
    trendScore,
    isTrending: options?.forceTrending ?? trendScore >= 70,
    trendScoreInputs,
    rankingVersion: RANKING_VERSION,
    rankingExplanation: buildExplanation(signals, confidence, staleFeatures),
  };
}

export async function scoreProducts(
  products: ProductSearchResult[],
  region: RegionCode,
  options?: { query?: string; forceTrending?: boolean }
): Promise<ProductSearchResult[]> {
  return Promise.all(
    products.map((p) =>
      scoreProduct(p, region, {
        query: options?.query,
        forceTrending: options?.forceTrending,
        listingCount: p.alsoListedOn ? p.alsoListedOn.length + 1 : 1,
      })
    )
  );
}
