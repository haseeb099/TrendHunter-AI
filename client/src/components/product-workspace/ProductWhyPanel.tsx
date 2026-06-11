import type { ProductSearchResult } from "@shared/searchTypes";
import { TrendScoreExplain } from "@/components/intelligence/TrendScoreExplain";
import { Card } from "@/components/ui/card";

type Props = { product: ProductSearchResult };

export function ProductWhyPanel({ product }: Props) {
  const explanation = product.rankingExplanation;

  return (
    <Card className="p-4 space-y-3">
      <h4 className="font-semibold text-sm">Why this product?</h4>
      {explanation?.summary ? (
        <p className="text-sm text-muted-foreground">{explanation.summary}</p>
      ) : product.rankReason ? (
        <p className="text-sm text-muted-foreground">{product.rankReason}</p>
      ) : null}
      {product.trendScoreInputs ? (
        <TrendScoreExplain inputs={product.trendScoreInputs} score={product.trendScore ?? 0} />
      ) : null}
      {explanation?.topSignals?.length ? (
        <ul className="text-xs space-y-1 text-muted-foreground">
          {explanation.topSignals.map((s) => (
            <li key={s.name}>
              {s.name}: {s.score}/100 (weight {Math.round(s.weight * 100)}%)
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
