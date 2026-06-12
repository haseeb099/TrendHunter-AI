export const RANKING_VERSION = "v3";



export const DEFAULT_WEIGHTS = {

  trendMomentum: 0.2,

  demandPersistence: 0.1,

  metaAdSaturation: 0.15,

  tiktokPressure: 0.1,

  marginSpread: 0.15,

  supplierConfidence: 0.08,

  competitionIntensity: 0.06,

  freshnessDecay: 0.08,

  queryIntentMatch: 0.04,

  returnRisk: 0.04,

} as const;



export type RankingWeights = { [K in keyof typeof DEFAULT_WEIGHTS]: number };



export const RANKING_WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS) as Array<keyof RankingWeights>;


