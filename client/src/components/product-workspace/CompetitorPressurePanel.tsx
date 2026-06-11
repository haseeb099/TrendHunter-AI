import { Card } from "@/components/ui/card";
import type { ProductSearchResult } from "@shared/searchTypes";

type Props = { product: ProductSearchResult };

export function CompetitorPressurePanel({ product }: Props) {
  const listingCount = (product.alsoListedOn?.length ?? 0) + 1;
  const adSat = product.trendScoreInputs?.adSaturationScore;

  return (
    <Card className="p-4 space-y-2">
      <h4 className="font-semibold text-sm">Competitor pressure</h4>
      <p className="text-sm">
        Cross-platform listings: <strong>{listingCount}</strong>
      </p>
      {adSat != null ? (
        <p className="text-sm text-muted-foreground">
          Meta ad opportunity score: {adSat}/100 (higher = less saturated)
        </p>
      ) : null}
      {product.alsoListedOn?.length ? (
        <p className="text-xs text-muted-foreground">
          Also listed on: {product.alsoListedOn.join(", ")}
        </p>
      ) : null}
    </Card>
  );
}
