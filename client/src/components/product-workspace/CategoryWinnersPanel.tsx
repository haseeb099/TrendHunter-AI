import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import type { ProductSearchResult } from "@shared/searchTypes";

type Props = { product: ProductSearchResult; region?: string };

export function CategoryWinnersPanel({ product, region = "US" }: Props) {
  const digest = trpc.intelligence.getMarketDigest.useQuery({
    region: region as "US" | "UK" | "EU" | "GLOBAL",
    category: product.category,
  });

  const rising = digest.data?.rising?.slice(0, 5) ?? [];

  return (
    <Card className="p-4 space-y-2">
      <h4 className="font-semibold text-sm">
        What&apos;s winning in {product.category ?? "this category"}
      </h4>
      {rising.length === 0 ? (
        <p className="text-xs text-muted-foreground">No category digest yet.</p>
      ) : (
        <ul className="text-xs space-y-1">
          {rising.map((item) => (
            <li key={item.keyword}>
              {item.keyword} — {item.momentumLabel}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
