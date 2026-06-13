import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
import { toastTrpcError } from "@/lib/trpcErrors";
import type { ProductSearchResult } from "@shared/searchTypes";
import { RefreshCw } from "lucide-react";

type Props = { product: ProductSearchResult };

export function SupplierConfidencePanel({ product }: Props) {
  const offers = trpc.product.getOffers.useQuery({
    title: product.title,
    productId: product.id,
    region: product.region,
  });

  const tier = offers.data?.confidenceTier ?? "low";
  const offerCount = offers.data?.offers.length ?? 0;
  const isMissing = offers.data?.dataState === "missing" || offers.data?.dataState === "unavailable";

  if (offers.isLoading) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="w-4 h-4" />
        Loading supplier offers…
      </Card>
    );
  }

  if (offers.error) {
    return (
      <Card className="p-4 space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{offers.error.message}</AlertDescription>
        </Alert>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void offers.refetch().catch((err) => toastTrpcError(err, () => void offers.refetch()));
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="font-semibold text-sm">Supplier confidence</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Offer quality tier</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {offers.data?.dataState ? (
            <DataFreshnessBadge
              state={offers.data.dataState}
              label={offers.data.dataLabel}
              dataMode={offers.data.dataMode}
              cachedAt={offers.data.cachedAt}
              stale={offers.data.stale}
            />
          ) : null}
          <Badge
            variant={tier === "high" ? "default" : tier === "medium" ? "secondary" : "outline"}
            className="capitalize"
          >
            {tier}
          </Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {isMissing
          ? "Supplier APIs not configured — add CJ or AliExpress keys to fetch live offers."
          : tier === "high"
            ? "Multiple suppliers with fast shipping — strong sourcing signal."
            : tier === "medium"
              ? "One supplier match — validate landed cost before scaling."
              : "No confirmed offers — run supplier search."}
      </p>
      <p className="text-xs">
        {offerCount} offer{offerCount !== 1 ? "s" : ""}{" "}
        {offers.data?.dataMode === "live" ? "live" : "cached"}
      </p>
    </Card>
  );
}
