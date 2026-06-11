import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import type { ProductSearchResult } from "@shared/searchTypes";

type Props = { product: ProductSearchResult; region?: string };

export function ProductDeltaPanel({ product, region = "US" }: Props) {
  const delta = trpc.product.getDelta.useQuery(
    {
      canonicalProductId: product.canonicalProductId ?? product.id,
      region: region as "US" | "UK" | "EU" | "GLOBAL",
    },
    { enabled: Boolean(product.canonicalProductId ?? product.id) }
  );

  if (delta.isLoading) {
    return <Card className="p-4 text-sm text-muted-foreground">Loading daily changes…</Card>;
  }

  const data = delta.data;
  if (!data) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        No snapshot diff yet — available after the next daily ingest.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-2">
      <h4 className="font-semibold text-sm">What changed today?</h4>
      {data.added ? <p className="text-sm text-primary">New in today&apos;s trending snapshot</p> : null}
      {data.removed ? <p className="text-sm text-destructive">Dropped from trending snapshot</p> : null}
      {data.scoreDelta != null ? (
        <p className="text-sm">
          Trend score delta: {data.scoreDelta > 0 ? "+" : ""}
          {data.scoreDelta}
        </p>
      ) : null}
      {!data.added && !data.removed && data.scoreDelta == null ? (
        <p className="text-sm text-muted-foreground">Stable since last snapshot.</p>
      ) : null}
    </Card>
  );
}
