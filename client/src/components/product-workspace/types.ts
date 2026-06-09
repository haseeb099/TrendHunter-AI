export type ProductDrawerTab =
  | "overview"
  | "suppliers"
  | "validate"
  | "profit"
  | "competitors";

export type ProductValidationResult = {
  trendScore: number;
  saturationScore: number;
  profitPotential: number;
  supplierReliability: number;
  overallScore: number;
  reasoning: string;
};
