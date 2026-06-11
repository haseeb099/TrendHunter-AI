import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import type { ProductSearchResult } from "@shared/searchTypes";

type Props = { product: ProductSearchResult };

export function NextMovesPanel({ product }: Props) {
  const moves = trpc.product.getNextMoves.useQuery({ productId: product.id, title: product.title });

  const items = moves.data?.moves ?? [];

  if (items.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Run validation and supplier search to unlock next-move recommendations.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <h4 className="font-semibold text-sm">Recommended next moves</h4>
      <ul className="space-y-2">
        {items.map((move) => (
          <li key={move.title} className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{move.title}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {move.priority}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">{move.description}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
