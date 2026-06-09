import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import type { ProductOffer, ProductSearchResult } from "@shared/searchTypes";
import { formatProductPrice } from "@shared/searchTypes";
import { Alert } from "@/components/ui/alert";
import { ProductValidationPanel } from "@/components/product-workspace/ProductValidationPanel";
import { ProductProfitPanel } from "@/components/product-workspace/ProductProfitPanel";
import { ProductCompetitorPanel } from "@/components/product-workspace/ProductCompetitorPanel";
import type { ProductDrawerTab, ProductValidationResult } from "@/components/product-workspace/types";
import {
  Calculator,
  CheckCircle2,
  ExternalLink,
  Heart,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export type { ProductDrawerTab };

type ProductDetailDrawerProps = {
  product: ProductSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: ProductDrawerTab;
  onAddToPipeline?: (product: ProductSearchResult, offer?: ProductOffer) => void;
  onAddToWatchlist?: (product: ProductSearchResult, offer?: ProductOffer) => void;
  onPipelineWithValidation?: (payload: {
    product: ProductSearchResult;
    validation: ProductValidationResult;
    offer?: ProductOffer;
  }) => void;
  pipelinePending?: boolean;
  savePending?: boolean;
};

export function ProductDetailDrawer({
  product,
  open,
  onOpenChange,
  initialTab = "overview",
  onAddToPipeline,
  onAddToWatchlist,
  onPipelineWithValidation,
  pipelinePending,
  savePending,
}: ProductDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<ProductDrawerTab>(initialTab);
  const [pipelineAdded, setPipelineAdded] = useState(false);
  const [savedToWatchlist, setSavedToWatchlist] = useState(false);

  const offersQuery = trpc.supplier.getOffersForProduct.useQuery(
    {
      productId: product?.id,
      title: product?.title ?? "",
      region: product?.region,
    },
    { enabled: open && Boolean(product?.title) }
  );

  useEffect(() => {
    if (open && product) {
      setActiveTab(initialTab);
      setPipelineAdded(false);
      setSavedToWatchlist(false);
    }
  }, [open, product?.id, initialTab, product]);

  if (!product) return null;

  const currency = product.currency ?? "USD";
  const bestOffer = offersQuery.data?.[0];

  const handlePipelineWithOffer = (offer?: ProductOffer) => {
    if (!onAddToPipeline) return;
    onAddToPipeline(product, offer);
    setPipelineAdded(true);
    toast.success(
      offer
        ? `Added with ${offer.supplierPlatform.toUpperCase()} offer`
        : "Added to pipeline"
    );
  };

  const handleSave = () => {
    if (!onAddToWatchlist) return;
    onAddToWatchlist(product, bestOffer);
    setSavedToWatchlist(true);
  };

  const handleValidationPipeline = ({
    validation,
    offer,
  }: {
    validation: ProductValidationResult;
    offer?: ProductOffer;
  }) => {
    if (onPipelineWithValidation) {
      onPipelineWithValidation({ product, validation, offer });
      setPipelineAdded(true);
      return;
    }
    if (!onAddToPipeline) return;
    onAddToPipeline(product, offer);
    setPipelineAdded(true);
    toast.success(`Pipeline updated · score ${validation.overallScore}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="product-drawer w-full sm:max-w-xl md:max-w-2xl p-0 gap-0 flex flex-col border-l border-border/80 [&>button]:z-30 [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:opacity-90">
        <SheetTitle className="sr-only">{product.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Product details, suppliers, validation, and profit tools
        </SheetDescription>

        {/* Hero */}
        <div className="product-drawer-hero relative shrink-0">
          {product.image ? (
            <img src={product.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <Search className="w-12 h-12 text-muted-foreground/25" />
            </div>
          )}
          <div className="product-drawer-hero-overlay" />
          <div className="relative z-10 p-5 pt-12 flex flex-col justify-end min-h-[200px]">
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge className="bg-background/90 text-foreground border-0 shadow-sm capitalize">
                {product.platform}
              </Badge>
              {product.region ? (
                <Badge variant="outline" className="bg-background/70 border-background/40">
                  {product.region}
                </Badge>
              ) : null}
              {product.isTrending ? (
                <Badge className="bg-primary/90 text-primary-foreground border-0">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Trending
                </Badge>
              ) : null}
              {product.trendScore !== undefined ? (
                <Badge variant="outline" className="bg-background/70 border-background/40">
                  Score {product.trendScore}
                </Badge>
              ) : null}
            </div>
            <h2 className="font-display text-xl font-semibold leading-snug text-white drop-shadow-sm line-clamp-3">
              {product.title}
            </h2>
            <p className="mt-2 text-lg font-semibold text-white/95 tabular-nums">
              {formatProductPrice(product.price, currency)}
              {product.rating !== null ? (
                <span className="ml-3 text-sm font-normal text-white/80 inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                  {product.rating}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Workspace tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ProductDrawerTab)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 pt-2">
            <TabsList className="w-full h-auto p-1 bg-muted/50 grid grid-cols-5 gap-0.5">
              <TabsTrigger value="overview" className="text-[11px] sm:text-xs px-1.5 py-2">
                Overview
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="text-[11px] sm:text-xs px-1.5 py-2">
                Suppliers
              </TabsTrigger>
              <TabsTrigger value="validate" className="text-[11px] sm:text-xs px-1.5 py-2 gap-1">
                <Zap className="w-3 h-3 hidden sm:inline" />
                Validate
              </TabsTrigger>
              <TabsTrigger value="profit" className="text-[11px] sm:text-xs px-1.5 py-2 gap-1">
                <Calculator className="w-3 h-3 hidden sm:inline" />
                Profit
              </TabsTrigger>
              <TabsTrigger value="competitors" className="text-[11px] sm:text-xs px-1.5 py-2">
                Spy
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {product.shippingDays !== null ? (
                  <div className="product-metric-tile text-center">
                    <Truck className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ship</p>
                    <p className="text-sm font-semibold">{product.shippingDays}d</p>
                  </div>
                ) : null}
                {product.category ? (
                  <div className="product-metric-tile text-center">
                    <Package className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</p>
                    <p className="text-sm font-semibold capitalize truncate">{product.category}</p>
                  </div>
                ) : null}
                {product.moq ? (
                  <div className="product-metric-tile text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">MOQ</p>
                    <p className="text-sm font-semibold">{product.moq}</p>
                  </div>
                ) : null}
              </div>

              {product.supplier ? (
                <p className="text-sm text-muted-foreground">
                  Supplier hint: <span className="text-foreground font-medium">{product.supplier}</span>
                </p>
              ) : null}

              {bestOffer ? (
                <div className="product-offer-highlight">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                    Best landed offer
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize">{bestOffer.supplierPlatform}</span>
                    <span className="font-display text-lg font-bold text-primary tabular-nums">
                      {formatProductPrice(bestOffer.landedCost, bestOffer.currency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bestOffer.warehouse} · ships from {bestOffer.shipFrom}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setActiveTab("suppliers")}
                  >
                    View all offers
                  </Button>
                </div>
              ) : offersQuery.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("validate")}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                  AI validate
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("profit")}>
                  <Calculator className="w-3.5 h-3.5 mr-2" />
                  Profit calc
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="suppliers" className="mt-0 space-y-3">
              {offersQuery.error ? (
                <Alert variant="destructive" className="text-sm">
                  {offersQuery.error.message}
                </Alert>
              ) : null}
              {offersQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : offersQuery.data && offersQuery.data.length > 0 ? (
                offersQuery.data.map((offer, index) => (
                  <div
                    key={offer.id}
                    className={`product-supplier-card ${index === 0 ? "product-supplier-card-best" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <p className="font-display font-semibold capitalize">
                          {offer.supplierPlatform}
                          {index === 0 ? (
                            <span className="ml-2 text-[10px] font-sans font-semibold uppercase tracking-wider text-primary">
                              Best
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {offer.warehouse} · Ship from {offer.shipFrom}
                        </p>
                      </div>
                      {offer.isDemo ? (
                        <Badge variant="outline">Demo</Badge>
                      ) : (
                        <Badge className="bg-success/15 text-success border-success/25">Live</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit</p>
                        <p className="font-medium tabular-nums">
                          {formatProductPrice(offer.unitCost, offer.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Shipping</p>
                        <p className="font-medium tabular-nums">
                          {formatProductPrice(offer.shippingCost, offer.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Landed</p>
                        <p className="font-display font-bold text-primary tabular-nums">
                          {formatProductPrice(offer.landedCost, offer.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">MOQ</p>
                        <p className="font-medium">{offer.moq}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Truck className="w-3.5 h-3.5" />
                      {offer.shippingDaysMin ?? "?"}–{offer.shippingDaysMax ?? "?"} days
                      {offer.processingDays ? ` · ${offer.processingDays}d processing` : ""}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setActiveTab("profit")}
                      >
                        <Calculator className="w-3.5 h-3.5 mr-1.5" />
                        Profit
                      </Button>
                      {onAddToPipeline ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={pipelinePending || pipelineAdded}
                          onClick={() => handlePipelineWithOffer(offer)}
                        >
                          {pipelineAdded ? (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {pipelineAdded ? "In pipeline" : "Add"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="product-panel-empty">
                  <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No supplier offers found for this product.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="validate" className="mt-0">
              <ProductValidationPanel
                productTitle={product.title}
                platform={product.platform}
                price={product.price}
                compact
                pipelinePending={pipelinePending}
                onAddToPipeline={({ validation }) =>
                  handleValidationPipeline({ validation, offer: bestOffer })
                }
              />
            </TabsContent>

            <TabsContent value="profit" className="mt-0">
              <ProductProfitPanel
                productTitle={product.title}
                productCost={bestOffer?.unitCost ?? 0}
                shippingCost={bestOffer?.shippingCost ?? 0}
                sellingPrice={product.price}
              />
            </TabsContent>

            <TabsContent value="competitors" className="mt-0">
              <ProductCompetitorPanel keyword={product.title} sourceUrl={product.sourceUrl} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Sticky actions — stay on page */}
        <div className="product-drawer-footer">
          <div className="flex gap-2">
            {onAddToWatchlist ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={savePending || savedToWatchlist}
                onClick={handleSave}
              >
                {savedToWatchlist ? (
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-success" />
                ) : (
                  <Heart className="w-4 h-4 mr-1.5" />
                )}
                {savedToWatchlist ? "Saved" : "Watchlist"}
              </Button>
            ) : null}
            {onAddToPipeline ? (
              <Button
                size="sm"
                className="flex-1"
                disabled={pipelinePending || pipelineAdded}
                onClick={() => handlePipelineWithOffer(bestOffer)}
              >
                {pipelineAdded ? (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                ) : (
                  <Plus className="w-4 h-4 mr-1.5" />
                )}
                {pipelineAdded ? "In pipeline" : "Pipeline"}
              </Button>
            ) : null}
            {product.sourceUrl ? (
              <Button size="sm" variant="ghost" className="px-3" asChild>
                <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
