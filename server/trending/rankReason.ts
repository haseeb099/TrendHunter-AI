import type { ProductSearchResult, RankingExplanation } from "@shared/searchTypes";

/** Build rich ranking explanation from scored product signals. */
export function buildRankingExplanation(product: ProductSearchResult): RankingExplanation | undefined {
  if (product.rankingExplanation) return product.rankingExplanation;

  const inputs = product.trendScoreInputs;
  if (!inputs) return undefined;

  const signals = (
    [
      { name: "Trend momentum", score: inputs.momentumScore, weight: 0.18 },
      { name: "Meta ad saturation", score: inputs.adSaturationScore, weight: 0.14 },
      { name: "Margin hint", score: inputs.marginHint, weight: 0.14 },
      { name: "Supplier confidence", score: inputs.supplierConfidence, weight: 0.1 },
    ] as Array<{ name: string; score: number | undefined; weight: number }>
  )
    .filter((s): s is { name: string; score: number; weight: number } => s.score != null)
    .map((s) => ({ ...s, contribution: Math.round(s.score * s.weight * 10) / 10 }));

  const top = signals.sort((a, b) => b.contribution - a.contribution)[0];
  return {
    version: product.rankingVersion ?? "v2",
    summary: top
      ? `${top.name} is the strongest signal (${top.score}/100).`
      : "Scored from cached trend and ad intelligence.",
    topSignals: signals.slice(0, 4),
    confidence: "medium",
  };
}

/** Build a short, user-facing explanation for why a product appears in Discover. */
export function buildRankReason(product: ProductSearchResult, rank: number): string {
  if (product.rankingExplanation?.summary) {
    return product.rankingExplanation.summary;
  }
  const parts: string[] = [];

  if (product.isTrending) {
    parts.push("Matched daily trending ingest");
  }

  if (product.trendScore !== undefined) {
    if (product.trendScore >= 80) {
      parts.push(`Strong trend score (${product.trendScore})`);
    } else if (product.trendScore >= 65) {
      parts.push(`Trend score ${product.trendScore}`);
    } else {
      parts.push(`Moderate trend signal (${product.trendScore})`);
    }
  }

  if (product.rating !== null && product.rating >= 4.5) {
    parts.push(`High rating (${product.rating})`);
  } else if (product.rating !== null && product.rating >= 4) {
    parts.push(`Good rating (${product.rating})`);
  }

  if (product.shippingDays !== null && product.shippingDays <= 7) {
    parts.push(`Fast shipping (${product.shippingDays}d)`);
  }

  if (product.category) {
    parts.push(`${product.category} category`);
  }

  if (product.platform) {
    parts.push(`Listed on ${product.platform}`);
  }

  if (parts.length === 0) {
    return `Ranked #${rank + 1} in cached trending snapshot`;
  }

  return parts.slice(0, 3).join(" · ");
}

export function attachRankReasons(results: ProductSearchResult[]): ProductSearchResult[] {
  return results.map((product, index) => ({
    ...product,
    rankingExplanation: product.rankingExplanation ?? buildRankingExplanation(product),
    rankReason: product.rankReason ?? buildRankReason(product, index),
  }));
}

/** @alias attachRankReasons */
export const enrichTrendingResults = attachRankReasons;
