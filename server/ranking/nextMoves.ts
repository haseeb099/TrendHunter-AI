import type { ProductSearchResult } from "@shared/searchTypes";
import type { RankingExplanation } from "@shared/searchTypes";

export type NextMove = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

export function computeNextMoves(
  product: ProductSearchResult,
  context?: {
    hasSupplierOffers?: boolean;
    inWatchlist?: boolean;
    rankingExplanation?: RankingExplanation;
  }
): NextMove[] {
  const moves: NextMove[] = [];
  const inputs = product.trendScoreInputs;
  const momentum = inputs?.momentumScore ?? 50;
  const ads = inputs?.adSaturationScore ?? 50;
  const margin = inputs?.marginHint ?? 50;

  if (momentum >= 70 && ads >= 70) {
    moves.push({
      id: "validate-source",
      title: "Validate and source before competitors",
      description:
        "Rising search interest with low ad competition — move quickly to secure inventory.",
      priority: "high",
    });
  }

  if (ads < 50 && margin >= 65) {
    moves.push({
      id: "differentiate-creative",
      title: "Differentiate creative angle",
      description:
        "High ad saturation but healthy margin — test unique hooks and angles before scaling.",
      priority: "medium",
    });
  }

  if (!context?.hasSupplierOffers) {
    moves.push({
      id: "run-supplier-search",
      title: "Run supplier search",
      description: "No supplier offers cached yet — find CJ or AliExpress sourcing options.",
      priority: "high",
    });
  }

  if (context?.inWatchlist) {
    moves.push({
      id: "pipeline-validate",
      title: "Move to pipeline validation",
      description: "Already on watchlist — run validation and add to your testing pipeline.",
      priority: "medium",
    });
  }

  if (product.rankingExplanation?.staleFeatures) {
    moves.push({
      id: "refresh-intel",
      title: "Refresh intelligence data",
      description: "Ranking features are stale — trigger live search or wait for daily ingest.",
      priority: "low",
    });
  }

  if (moves.length === 0) {
    moves.push({
      id: "monitor",
      title: "Monitor trend signals",
      description: "Moderate opportunity — add to watchlist and track momentum over 7 days.",
      priority: "low",
    });
  }

  return moves;
}
