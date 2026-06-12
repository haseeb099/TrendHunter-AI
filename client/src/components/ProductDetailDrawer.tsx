import { useEffect, useState } from "react";
import {
  SidePanel,
  SidePanelContent,
  SidePanelFooter,
} from "@/components/side-panel/SidePanel";
import { SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { ProductOffer, ProductSearchResult } from "@shared/searchTypes";
import { formatProductPrice } from "@shared/searchTypes";
import { Alert } from "@/components/ui/alert";
import { ProductValidationPanel } from "@/components/product-workspace/ProductValidationPanel";
import { ProductProfitPanel } from "@/components/product-workspace/ProductProfitPanel";
import { ProductCompetitorPanel } from "@/components/product-workspace/ProductCompetitorPanel";
import { MiniIntelPanel } from "@/components/intelligence/MiniIntelPanel";
import { PublicProductIntelligence } from "@/components/intelligence/PublicProductIntelligence";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
import { TrendScoreExplain } from "@/components/intelligence/TrendScoreExplain";
import type { ProductDrawerTab, ProductValidationResult } from "@/components/product-workspace/types";
import {
  Calculator,
  CheckCircle2,
  ExternalLink,
  Heart,
  Lock,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Truck,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Link } from "wouter";
import { getDashboardPath } from "@/config/dashboardNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePlan } from "@/_core/hooks/usePlan";
import { PlanFeatureGate } from "@/components/workspace/PlanFeatureGate";
import { DrawerPanelFallback } from "@/components/product-workspace/DrawerPanelFallback";
import { ProductWhyPanel } from "@/components/product-workspace/ProductWhyPanel";
import { ProductDeltaPanel } from "@/components/product-workspace/ProductDeltaPanel";
import { CategoryWinnersPanel } from "@/components/product-workspace/CategoryWinnersPanel";
import { SupplierConfidencePanel } from "@/components/product-workspace/SupplierConfidencePanel";
import { SupplierMatchBadge } from "@/components/product-workspace/SupplierMatchBadge";
import { CompetitorPressurePanel } from "@/components/product-workspace/CompetitorPressurePanel";
import { NextMovesPanel } from "@/components/product-workspace/NextMovesPanel";

const drawerTabClass =
  "side-panel-tab flex-1 text-[11px] sm:text-xs px-1.5 py-2 h-auto rounded-lg border-0 shadow-none bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/50";

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
  /** Guest / logged-out mode — public intel only, no protected APIs */
  guestMode?: boolean;
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
  guestMode = false,
}: ProductDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<ProductDrawerTab>(initialTab);
  const [pipelineAdded, setPipelineAdded] = useState(false);
  const [savedToWatchlist, setSavedToWatchlist] = useState(false);
  const { canAccess } = usePlan();
  const canValidate = !guestMode && canAccess("validate");
  const canSpy = !guestMode && canAccess("competitors");
  const canOffers = !guestMode && canAccess("supplier_offers");
  const canSocial = !guestMode && canAccess("social");

  const offersQuery = trpc.supplier.getOffersForProduct.useQuery(
    {
      productId: product?.id,
      title: product?.title ?? "",
      region: product?.region,
      category: product?.category,
      targetPrice: product?.price,
    },
    { enabled: open && Boolean(product?.title) && canOffers && !guestMode }
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
  const offersData = offersQuery.data;
  const offers = offersData?.offers ?? [];
  const bestOffer = offers[0];

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
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent
        size="xl"
        onClose={() => onOpenChange(false)}
        className="product-drawer"
      >
        <SheetTitle className="sr-only">{product.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Product details, suppliers, validation, and profit tools
        </SheetDescription>

        {/* Hero */}
        <div className="product-drawer-hero relative shrink-0">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
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
              {product.dataLabel ? (
                <DataFreshnessBadge
                  state={product.dataState}
                  label={product.dataLabel}
                  className="[&>span:last-child]:hidden"
                />
              ) : null}
              {product.inferredScores ? (
                <Badge variant="outline" className="bg-background/70 border-amber-300 text-amber-800 text-[10px]">
                  Estimated scores
                </Badge>
              ) : null}
              {product.trendScore !== undefined ? (
                <Badge variant="outline" className="bg-background/70 border-background/40 gap-1">
                  <TrendScoreExplain
                    score={product.trendScore}
                    inputs={product.trendScoreInputs}
                    className="text-foreground"
                  />
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
          <div className="side-panel-tabs shrink-0 !px-4 !py-2">
            <TabsList
              className={cn(
                "w-full h-auto p-1 bg-transparent grid gap-1 border-0 shadow-none",
                guestMode ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-6"
              )}
            >
              <TabsTrigger value="overview" className={drawerTabClass}>
                Overview
              </TabsTrigger>
              {!guestMode ? (
                <>
                  <TabsTrigger value="suppliers" disabled={!canOffers} className={drawerTabClass}>
                    Suppliers
                    {!canOffers ? <Lock className="w-3 h-3 opacity-60" /> : null}
                  </TabsTrigger>
                  <TabsTrigger value="profit" className={cn(drawerTabClass, "gap-1")}>
                    <Calculator className="w-3 h-3 hidden sm:inline" />
                    Profit
                  </TabsTrigger>
                  <TabsTrigger
                    value="validate"
                    disabled={!canValidate}
                    className={cn(drawerTabClass, "gap-1")}
                  >
                    <Zap className="w-3 h-3 hidden sm:inline" />
                    Validate
                    {!canValidate ? <Lock className="w-3 h-3 opacity-60" /> : null}
                  </TabsTrigger>
                  <TabsTrigger value="competitors" disabled={!canSpy} className={drawerTabClass}>
                    Spy
                    {!canSpy ? <Lock className="w-3 h-3 opacity-60" /> : null}
                  </TabsTrigger>
                </>
              ) : null}
              <TabsTrigger value="intelligence" className={cn(drawerTabClass, "gap-1")}>
                <TrendingUp className="w-3 h-3 hidden sm:inline" />
                Intel
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

              <ProductWhyPanel product={product} />
              <ProductDeltaPanel product={product} region={product.region} />
              <CompetitorPressurePanel product={product} />
              <SupplierConfidencePanel product={product} />
              <CategoryWinnersPanel product={product} region={product.region} />
              <NextMovesPanel product={product} />

              {canOffers && bestOffer ? (
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
              ) : canOffers && offersQuery.isLoading ? (
                <DrawerPanelFallback
                  loading
                  title=""
                  loadingLabel="Loading supplier offers…"
                />
              ) : null}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canValidate}
                  onClick={() => canValidate && setActiveTab("validate")}
                >
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
              {!canOffers ? (
                <PlanFeatureGate feature="supplier_offers" />
              ) : null}
              {canOffers && offersData?.matchState ? (
                <SupplierMatchBadge
                  matchState={offersData.matchState}
                  message={offersData.message}
                />
              ) : null}
              {canOffers && offersQuery.error ? (
                <DrawerPanelFallback
                  icon={Package}
                  title="Could not load offers"
                  description={offersQuery.error.message}
                />
              ) : null}
              {canOffers && offersQuery.isLoading ? (
                <DrawerPanelFallback
                  loading
                  title=""
                  loadingLabel="Loading supplier offers…"
                />
              ) : canOffers && offersQuery.data && offers.length > 0 ? (
                offers.map((offer, index) => (
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
                      {index === 0 && offersData ? (
                        <DataFreshnessBadge
                          dataMode={offersData.dataMode}
                          cachedAt={offersData.cachedAt}
                          stale={offersData.stale}
                          unavailable={offers.length === 0}
                        />
                      ) : null}
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
              ) : canOffers ? (
                <DrawerPanelFallback
                  icon={Package}
                  title="No supplier offers"
                  description="We couldn't find CJ or AliExpress offers for this product yet."
                  action={
                    <div className="flex flex-col gap-2 mt-3 w-full">
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`https://cjdropshipping.com/search?q=${encodeURIComponent(product.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Search CJ Dropshipping
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(product.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Search AliExpress
                        </a>
                      </Button>
                    </div>
                  }
                />
              ) : null}
            </TabsContent>

            <TabsContent value="validate" className="mt-0">
              {canValidate ? (
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
              ) : (
                <PlanFeatureGate feature="validate" />
              )}
            </TabsContent>

            <TabsContent value="profit" className="mt-0">
              {canOffers && offersQuery.isLoading ? (
                <DrawerPanelFallback loading loadingLabel="Checking supplier match…" />
              ) : offersData?.matchState === "none" || (!canOffers && !guestMode) ? (
                <DrawerPanelFallback
                  icon={Calculator}
                  title="No supplier data"
                  description="Add your own costs in the full profit calculator, or find supplier offers first."
                  action={
                    <Link
                      href={`${getDashboardPath("profit")}?productTitle=${encodeURIComponent(product.title)}&sellingPrice=${product.price}${offersData?.matchState ? `&supplierMatchState=${offersData.matchState}` : ""}`}
                    >
                      <Button size="sm" variant="outline" className="mt-3">
                        Open profit calculator
                      </Button>
                    </Link>
                  }
                />
              ) : product.price > 0 ? (
                <ProductProfitPanel
                  productTitle={product.title}
                  productCost={bestOffer?.unitCost ?? 0}
                  shippingCost={bestOffer?.shippingCost ?? 0}
                  sellingPrice={product.price}
                  category={product.category}
                  supplierMatchState={offersData?.matchState ?? product.supplierMatchState}
                  approximatePrice={offersData?.matchState === "similar"}
                  dataLabel={product.dataLabel}
                />
              ) : (
                <DrawerPanelFallback
                  icon={Calculator}
                  title="Add a selling price"
                  description="This product has no price yet. Open the listing or add it manually to model margin."
                />
              )}
            </TabsContent>

            <TabsContent value="competitors" className="mt-0">
              {canSpy ? (
                <ProductCompetitorPanel keyword={product.title} sourceUrl={product.sourceUrl} />
              ) : (
                <PlanFeatureGate feature="competitors" />
              )}
            </TabsContent>

            <TabsContent value="intelligence" className="mt-0 space-y-4">
              {guestMode ? (
                <PublicProductIntelligence
                  keyword={product.title}
                  region={product.region ?? "US"}
                />
              ) : (
                <MiniIntelPanel keyword={product.title} region={product.region ?? "US"} />
              )}
              {canSocial ? (
                <Link
                  href={`${getDashboardPath("social")}?productTitle=${encodeURIComponent(product.title)}&region=${product.region ?? "US"}&productId=${encodeURIComponent(product.id)}`}
                >
                  <Button size="sm" variant="secondary" className="w-full">
                    <MessageSquare className="w-3.5 h-3.5 mr-2" />
                    Open Social Media Kit
                  </Button>
                </Link>
              ) : null}
            </TabsContent>
          </div>
        </Tabs>

        <SidePanelFooter className="product-drawer-footer !px-5">
          <div className="flex gap-2 w-full">
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
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open product source"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </SidePanelFooter>
      </SidePanelContent>
    </SidePanel>
  );
}
