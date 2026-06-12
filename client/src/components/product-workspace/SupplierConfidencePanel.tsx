import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import type { ProductSearchResult } from "@shared/searchTypes";

type Props = { product: ProductSearchResult };

export function SupplierConfidencePanel({ product }: Props) {
  const offers = trpc.product.getOffers.useQuery({
    title: product.title,
    productId: product.id,
    region: product.region,
  });

  const tier = offers.data?.confidenceTier ?? "low";

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm">Supplier confidence</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Offer quality tier</p>
        </div>
        <Badge
          variant={tier === "high" ? "default" : tier === "medium" ? "secondary" : "outline"}
          className="capitalize"
        >
          {tier}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {tier === "high"
          ? "Multiple suppliers with fast shipping — strong sourcing signal."
          : tier === "medium"
            ? "One supplier match — validate landed cost before scaling."
            : "No confirmed offers — run supplier search."}
      </p>
      <p className="text-xs">{offers.data?.offers.length ?? 0} offer(s) cached</p>
    </Card>
  );
}
