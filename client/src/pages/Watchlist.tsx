import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import type { ProductDrawerTab, ProductValidationResult } from "@/components/product-workspace/types";
import { BookmarkIcon, Trash2, ExternalLink, ShieldCheck, Plus, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { ProductSearchResult, ProductOffer, RegionCode } from "@shared/searchTypes";
import type { WatchlistItem } from "../../../drizzle/schema";
import { useOnboarding } from "@/_core/hooks/useOnboarding";

function watchlistItemToProduct(item: WatchlistItem): ProductSearchResult {
  return {
    id: item.productId ?? `watchlist-${item.id}`,
    title: item.productTitle,
    price: item.price ?? 0,
    platform: item.platform,
    image: item.productImage,
    shippingDays: null,
    supplier: item.supplierPlatform,
    rating: null,
    sourceUrl: item.sourceUrl,
    region: (item.region as RegionCode | null) ?? undefined,
  };
}

export default function Watchlist() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { completeStep } = useOnboarding();
  const [detailProduct, setDetailProduct] = useState<ProductSearchResult | null>(null);
  const [drawerTab, setDrawerTab] = useState<ProductDrawerTab>("overview");

  const watchlistQuery = trpc.watchlist.getWatchlist.useQuery();

  const removeMutation = trpc.watchlist.removeFromWatchlist.useMutation({
    onSuccess: async () => {
      await utils.watchlist.getWatchlist.invalidate();
      toast.success("Removed from watchlist");
    },
    onError: (error) => toast.error(error.message || "Failed to remove item"),
  });

  const addToPipeline = trpc.pipeline.createPipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      completeStep("pipeline");
      toast.success("Added to pipeline");
    },
    onError: (err) => toast.error(err.message),
  });

  const openDrawer = (item: WatchlistItem, tab: ProductDrawerTab = "overview") => {
    setDetailProduct(watchlistItemToProduct(item));
    setDrawerTab(tab);
  };

  const handlePipeline = (product: ProductSearchResult, offer?: ProductOffer) => {
    addToPipeline.mutate({
      productId: product.id.startsWith("watchlist-") ? undefined : product.id,
      productTitle: product.title,
      productImage: product.image ?? undefined,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl ?? undefined,
      region: product.region,
      supplierPlatform: offer?.supplierPlatform ?? product.supplier ?? undefined,
      landedCost: offer?.landedCost,
      stage: "testing",
    });
  };

  const handlePipelineWithValidation = ({
    product,
    validation,
    offer,
  }: {
    product: ProductSearchResult;
    validation: ProductValidationResult;
    offer?: ProductOffer;
  }) => {
    const estimatedProfit =
      offer && product.price > 0 ? product.price - offer.landedCost : undefined;
    addToPipeline.mutate({
      productId: product.id.startsWith("watchlist-") ? undefined : product.id,
      productTitle: product.title,
      productImage: product.image ?? undefined,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl ?? undefined,
      region: product.region,
      supplierPlatform: offer?.supplierPlatform ?? product.supplier ?? undefined,
      landedCost: offer?.landedCost,
      estimatedProfit,
      validationScore: validation.overallScore,
      stage: validation.overallScore >= 75 ? "scaling" : "testing",
      notes: `AI validation: trend ${validation.trendScore}, saturation ${validation.saturationScore}${offer ? ` · ${offer.supplierPlatform} landed ${offer.landedCost.toFixed(2)}` : ""}`,
    });
  };

  const count = watchlistQuery.data?.length ?? 0;

  if (watchlistQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (watchlistQuery.isError) {
    return (
      <div className="card-elevated max-w-md mx-auto p-8 text-center space-y-4">
        <p className="font-medium text-sm">Could not load watchlist</p>
        <p className="text-sm text-muted-foreground">{watchlistQuery.error.message}</p>
        <Button variant="outline" onClick={() => watchlistQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Watchlist"
        description={`Saved products you're tracking (${count})`}
        badge={count > 0 ? <Badge variant="secondary">{count} items</Badge> : undefined}
      />

      {watchlistQuery.data && watchlistQuery.data.length > 0 ? (
        <div className="grid gap-4">
          {watchlistQuery.data.map((item) => (
            <Card
              key={item.id}
              className="surface-interactive p-5 flex gap-4 items-start group cursor-pointer"
              onClick={() => openDrawer(item, "overview")}
            >
              {item.productImage ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted/50 ring-1 ring-border flex-shrink-0 overflow-hidden">
                  <img
                    src={item.productImage}
                    alt={item.productTitle}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted/50 ring-1 ring-border flex items-center justify-center shrink-0">
                  <BookmarkIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {item.productTitle}
                </h3>
                <div className="flex gap-2 flex-wrap mb-2">
                  <Badge variant="secondary" className="capitalize">
                    {item.platform}
                  </Badge>
                  {item.region ? <Badge variant="outline">{item.region}</Badge> : null}
                  {item.price != null ? (
                    <Badge variant="outline">${item.price.toFixed(2)}</Badge>
                  ) : null}
                  {item.landedCost != null ? (
                    <Badge variant="outline">Landed ${item.landedCost.toFixed(2)}</Badge>
                  ) : null}
                  {item.supplierPlatform ? (
                    <Badge variant="outline">{item.supplierPlatform}</Badge>
                  ) : null}
                </div>
                {item.notes ? (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.notes}</p>
                ) : null}
                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="default" onClick={() => openDrawer(item, "overview")}>
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Details
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openDrawer(item, "validate")}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Validate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addToPipeline.isPending}
                    onClick={() => handlePipeline(watchlistItemToProduct(item))}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Pipeline
                  </Button>
                  {item.sourceUrl ? (
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open product source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.productTitle} from watchlist`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeMutation.mutate({ id: item.id });
                }}
                disabled={removeMutation.isPending}
                className="text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookmarkIcon}
          title="Your watchlist is empty"
          description="Save products from Discover to track prices and opportunities here."
          action={{
            label: "Go to discover",
            onClick: () => setLocation("/dashboard"),
          }}
        />
      )}

      <ProductDetailDrawer
        product={detailProduct}
        open={Boolean(detailProduct)}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        initialTab={drawerTab}
        onAddToPipeline={handlePipeline}
        onPipelineWithValidation={handlePipelineWithValidation}
        pipelinePending={addToPipeline.isPending}
      />
    </div>
  );
}
