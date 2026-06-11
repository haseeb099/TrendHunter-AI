export type ProductDrawerTab =
  | "overview"
  | "suppliers"
  | "validate"
  | "profit"
  | "competitors"
  | "intelligence";

import type { AdLibrarySnapshot, TrendSignal } from "@shared/intelligenceTypes";

export type ProductValidationResult = {
  trendScore: number;
  saturationScore: number;
  profitPotential: number;
  supplierReliability: number;
  overallScore: number;
  reasoning: string;
  dimensionReasoning?: {
    trendScore: string;
    saturationScore: string;
    profitPotential: string;
    supplierReliability: string;
    overallScore: string;
  };
};

export type ProductValidationResponse = ProductValidationResult & {
  creditsUsed?: number;
  trendSignal?: TrendSignal | null;
  adSnapshot?: AdLibrarySnapshot | null;
};

export function pickValidationScores(
  data: ProductValidationResponse | undefined
): ProductValidationResult | undefined {
  if (!data) return undefined;
  return {
    trendScore: data.trendScore,
    saturationScore: data.saturationScore,
    profitPotential: data.profitPotential,
    supplierReliability: data.supplierReliability,
    overallScore: data.overallScore,
    reasoning: data.reasoning,
    dimensionReasoning: data.dimensionReasoning,
  };
}
