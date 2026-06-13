import type {

  ProductSearchResult,

  RankingExplanation,

  RegionCode,

  TrendScoreInputs,

} from "@shared/searchTypes";

import type { TrendWindow } from "@shared/intelligenceTypes";

import { and, desc, eq, isNull, or } from "drizzle-orm";

import { rankingConfigs } from "../../drizzle/schema";

import { getAdLibrarySnapshot } from "../intelligence/adLibrary";

import { getTikTokAdsSnapshot } from "../intelligence/tiktokAds";

import { applyTrendWindow, getTrendSignal } from "../intelligence/trends";

import { inferTrendScore } from "../search/normalize";

import { linkKeywordFromTitle } from "../discovery/keywordLinker";

import { getProductFeatures, materializeProductFeatures } from "./features";

import { inferCategoryFromTitle } from "../search/categories";

import { getDb } from "../db";

import {

  DEFAULT_WEIGHTS,

  RANKING_VERSION,

  RANKING_WEIGHT_KEYS,

  type RankingWeights,

} from "@shared/ranking";



export { DEFAULT_WEIGHTS, RANKING_VERSION, RANKING_WEIGHT_KEYS, type RankingWeights };



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



function adOpportunityScore(activeAdCount: number | null | undefined): number | null {

  if (activeAdCount == null) return null;

  if (activeAdCount === 0) return 90;

  if (activeAdCount < 5) return 80;

  if (activeAdCount < 20) return 60;

  if (activeAdCount < 50) return 40;

  return 25;

}



function tiktokOpportunityScore(activeAdCount: number | null | undefined): number | null {

  if (activeAdCount == null) return null;

  if (activeAdCount < 3) return 85;

  if (activeAdCount < 10) return 65;

  if (activeAdCount < 30) return 45;

  return 30;

}



function marginScore(price: number, landedCost?: number): { score: number; inferred: boolean } {

  if (!landedCost || landedCost <= 0 || price <= 0) {

    return { score: marginHintScore(price), inferred: true };

  }

  const margin = (price - landedCost) / price;

  if (margin >= 0.5) return { score: 90, inferred: false };

  if (margin >= 0.35) return { score: 75, inferred: false };

  if (margin >= 0.2) return { score: 60, inferred: false };

  return { score: 40, inferred: false };

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



function freshnessScore(listingFetchedAt?: string): number | null {

  if (!listingFetchedAt) return null;

  const ageHours = (Date.now() - new Date(listingFetchedAt).getTime()) / (1000 * 60 * 60);

  return Math.round(100 * Math.exp(-ageHours / 48));

}



function queryIntentScore(query: string | undefined, title: string): number | null {

  if (!query) return null;

  const qTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));

  const tTokens = title.toLowerCase().split(/\s+/).filter(Boolean);

  if (qTokens.size === 0) return null;

  const hits = tTokens.filter((t) => qTokens.has(t)).length;

  return Math.min(100, Math.round((hits / qTokens.size) * 100));

}



function returnRiskScore(product: ProductSearchResult): number {

  const category = product.category ?? inferCategoryFromTitle(product.title) ?? "home";

  const risk = RETURN_RISK[category] ?? 0.4;

  const pricePenalty = product.price < 15 ? 0.15 : 0;

  return Math.round(100 * (1 - risk - pricePenalty));

}



/** Sustained demand — decoupled from short-term momentum spike. */
function demandPersistenceScore(
  changePercent90d: number | null | undefined,
  momentumLabel: "rising" | "stable" | "declining" | null | undefined
): number | null {
  if (changePercent90d != null) {
    const abs = Math.abs(changePercent90d);
    if (abs < 10) return 78;
    if (changePercent90d >= 10 && changePercent90d < 25) return 85;
    if (changePercent90d >= 25 && changePercent90d < 45) return 68;
    if (changePercent90d >= 45) return 52;
    if (changePercent90d <= -25) return 35;
    return 48;
  }
  if (momentumLabel === "stable") return 72;
  if (momentumLabel === "rising") return 62;
  if (momentumLabel === "declining") return 38;
  return null;
}



const ALL_RANKING_SIGNAL_NAMES = [

  "Trend momentum",

  "Demand persistence",

  "Meta ad saturation",

  "TikTok creative pressure",

  "Margin spread",

  "Supplier confidence",

  "Competition intensity",

  "Freshness",

  "Query intent match",

  "Return risk",

] as const;



function competitionScore(listingCount?: number): number | null {

  if (!listingCount) return null;

  if (listingCount <= 1) return 80;

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

  signals: Array<{ name: string; score: number; weight: number; inferred?: boolean }>,

  confidence: RankingExplanation["confidence"],

  staleFeatures?: boolean,

  inferredScores?: boolean,

  scoreCoverage?: number

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

  if (inferredScores) {

    summary = "Score uses estimated signals — connect live providers for higher confidence.";

  } else if (top) {

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



  const signalsUsed = signals.map((s) => s.name);

  const signalsMissing = ALL_RANKING_SIGNAL_NAMES.filter((n) => {
    const s = signals.find((sig) => sig.name === n);
    return !s || Boolean(s.inferred);
  });

  const partialScore =

    staleFeatures === true ||

    (scoreCoverage != null ? scoreCoverage < 0.95 : signalsMissing.length > 0);



  return {

    version: RANKING_VERSION,

    summary,

    topSignals,

    signals: withContribution,

    signalsUsed,

    signalsMissing,

    partialScore,

    scoreCoverage,

    confidence,

    staleFeatures,

    inferredScores,

  };

}



type ResolvedSignal = { score: number; inferred: boolean };



function resolveSignal(

  value: number | null | undefined,

  fallback: number | null,

  allowInferred: boolean

): ResolvedSignal | null {

  if (value != null) return { score: value, inferred: false };

  if (allowInferred && fallback != null) return { score: fallback, inferred: true };

  return null;

}



export async function scoreProduct(

  product: ProductSearchResult,

  region: RegionCode,

  options?: {

    query?: string;

    forceTrending?: boolean;

    listingCount?: number;

    landedCost?: number;

    allowHeuristicScores?: boolean;

    /** When true, refresh intel snapshots on cache miss (ingest/live only). */
    fetchLiveIntel?: boolean;

    timeframe?: TrendWindow;

  }

): Promise<ProductSearchResult> {

  const allowInferred = options?.allowHeuristicScores ?? false;

  const base = allowInferred

    ? inferTrendScore({

        ...product,

        isTrending: options?.forceTrending ?? product.isTrending ?? undefined,

      })

    : { score: product.trendScore ?? 0, inputs: product.trendScoreInputs ?? { baseScore: 0, ratingBoost: 0, shippingBoost: 0, priceBoost: 0, trendingFlag: 0 } };



  const canonicalId = product.canonicalProductId ?? product.id;

  let features = await getProductFeatures(canonicalId, region);

  const featureAge = features

    ? Date.now() - features.computedAt.getTime()

    : Number.POSITIVE_INFINITY;

  const staleFeatures = featureAge > 24 * 60 * 60 * 1000;



  const keyword =

    features?.keyword ?? (await linkKeywordFromTitle(product.title, region));



  let momentum = features?.momentumScore;

  let demandPersistence = demandPersistenceScore(undefined, undefined);

  let adSat = features?.adSaturationScore;

  let tiktokPressure = features?.tiktokPressureScore;

  let supplier = features?.supplierScore;

  let competition = features?.competitionScore;

  let freshness = features?.freshnessScore;



  const fetchLiveIntel = options?.fetchLiveIntel ?? false;



  if ((!features || staleFeatures) && fetchLiveIntel) {

    const [trend, ads, tiktok] = await Promise.all([

      getTrendSignal(keyword, region, { live: true }),

      getAdLibrarySnapshot(keyword, region, { live: true }),

      getTikTokAdsSnapshot(keyword, region, { live: true }),

    ]);



    const windowedTrend =

      trend && options?.timeframe ? applyTrendWindow(trend, options.timeframe) : trend;

    momentum =

      windowedTrend?.momentumScore ?? (allowInferred ? base.score : momentum);

    demandPersistence =

      demandPersistenceScore(

        windowedTrend?.changePercent90d,

        windowedTrend?.momentumLabel

      ) ?? demandPersistence;

    adSat = adOpportunityScore(ads?.activeAdCount) ?? adSat;

    tiktokPressure = tiktokOpportunityScore(tiktok?.activeAdCount) ?? tiktokPressure;

    if (allowInferred) {

      supplier = supplier ?? supplierScore(product);

    }

    competition = competitionScore(options?.listingCount) ?? competition;

    freshness = freshnessScore(product.listingFetchedAt) ?? freshness;



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

  } else if (features) {

    demandPersistence =

      demandPersistenceScore(

        undefined,

        momentum != null && momentum >= 70

          ? "rising"

          : momentum != null && momentum <= 40

            ? "declining"

            : "stable"

      ) ?? demandPersistence;

  }



  const marginResolved = marginScore(product.price, options?.landedCost);

  const weights = await loadActiveRankingWeights(region);



  const rawSignals: Array<{

    name: string;

    resolved: ResolvedSignal | null;

    weight: number;

  }> = [

    {

      name: "Trend momentum",

      resolved: resolveSignal(momentum, allowInferred ? base.score : null, allowInferred),

      weight: weights.trendMomentum,

    },

    {

      name: "Demand persistence",

      resolved: resolveSignal(

        demandPersistence,

        allowInferred ? Math.max(40, (momentum ?? base.score) - 10) : null,

        allowInferred

      ),

      weight: weights.demandPersistence,

    },

    {

      name: "Meta ad saturation",

      resolved: resolveSignal(adSat, allowInferred ? 50 : null, allowInferred),

      weight: weights.metaAdSaturation,

    },

    {

      name: "TikTok creative pressure",

      resolved: resolveSignal(tiktokPressure, allowInferred ? 50 : null, allowInferred),

      weight: weights.tiktokPressure,

    },

    {

      name: "Margin spread",

      resolved: { score: marginResolved.score, inferred: marginResolved.inferred },

      weight: weights.marginSpread,

    },

    {

      name: "Supplier confidence",

      resolved: resolveSignal(supplier, allowInferred ? 50 : null, allowInferred),

      weight: weights.supplierConfidence,

    },

    {

      name: "Competition intensity",

      resolved: resolveSignal(competition, allowInferred ? 50 : null, allowInferred),

      weight: weights.competitionIntensity,

    },

    {

      name: "Freshness",

      resolved: resolveSignal(freshness, allowInferred ? 50 : null, allowInferred),

      weight: weights.freshnessDecay,

    },

    {

      name: "Query intent match",

      resolved: resolveSignal(

        queryIntentScore(options?.query, product.title),

        allowInferred ? 50 : null,

        allowInferred

      ),

      weight: weights.queryIntentMatch,

    },

    {

      name: "Return risk",

      resolved: { score: returnRiskScore(product), inferred: false },

      weight: weights.returnRisk,

    },

  ];



  const activeSignals = rawSignals.filter((s): s is typeof s & { resolved: ResolvedSignal } =>

    Boolean(s.resolved)

  );

  const inferredScores = activeSignals.some((s) => s.resolved.inferred);



  const usedWeight = activeSignals.reduce((sum, s) => sum + s.weight, 0);

  const totalWeight = weightSum(weights);

  const scoreCoverage = totalWeight > 0 ? usedWeight / totalWeight : 0;

  const fused =

    usedWeight > 0

      ? Math.round(

          activeSignals.reduce((sum, s) => sum + s.resolved.score * s.weight, 0) / usedWeight

        )

      : null;



  const floor = options?.forceTrending ? 65 : 0;

  const trendScore =

    fused != null

      ? Math.min(100, Math.max(product.trendScore ?? 0, fused, floor))

      : product.trendScore ?? undefined;



  const signals = activeSignals.map((s) => ({

    name: s.name,

    score: s.resolved.score,

    weight: s.weight,

    inferred: s.resolved.inferred,

  }));



  const confidence: RankingExplanation["confidence"] = staleFeatures

    ? "low"

    : inferredScores

      ? "medium"

      : signals.length >= 6

        ? "high"

        : "medium";



  const trendScoreInputs: TrendScoreInputs = {

    ...base.inputs,

    momentumScore: momentum ?? undefined,

    adSaturationScore: adSat ?? undefined,

    marginHint: marginResolved.score,

    supplierConfidence: supplier ?? undefined,

  };



  return {

    ...product,

    trendScore,

    isTrending:

      options?.forceTrending ?? (trendScore != null ? trendScore >= 70 : product.isTrending ?? null),

    trendScoreInputs,

    rankingVersion: RANKING_VERSION,

    inferredScores,

    rankingExplanation: buildExplanation(

      signals,

      confidence,

      staleFeatures,

      inferredScores,

      scoreCoverage

    ),

  };

}



export async function scoreProducts(

  products: ProductSearchResult[],

  region: RegionCode,

  options?: {
    query?: string;
    forceTrending?: boolean;
    allowHeuristicScores?: boolean;
    fetchLiveIntel?: boolean;
    timeframe?: TrendWindow;
  }

): Promise<ProductSearchResult[]> {

  return Promise.all(

    products.map((p) =>

      scoreProduct(p, region, {

        query: options?.query,

        forceTrending: options?.forceTrending,

        listingCount: p.alsoListedOn ? p.alsoListedOn.length + 1 : 1,

        allowHeuristicScores: options?.allowHeuristicScores,

        fetchLiveIntel: options?.fetchLiveIntel,

        timeframe: options?.timeframe,

      })

    )

  );

}


