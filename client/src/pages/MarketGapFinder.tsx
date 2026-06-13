import { useState } from "react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { PageHeader } from "@/components/PageHeader";

import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";

import type { ProductDrawerTab } from "@/components/product-workspace/types";

import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";

import { FormSection } from "@/components/workspace/FormSection";

import { InsightCard } from "@/components/workspace/InsightCard";


import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";

import { BarChart3, TrendingUp, AlertCircle, Sparkles, ShieldCheck, Search } from "lucide-react";

import { useLocation } from "wouter";

import { trpc } from "@/lib/trpc";

import { Spinner } from "@/components/ui/spinner";

import { Alert, AlertDescription } from "@/components/ui/alert";

import type { ProductSearchResult } from "@shared/searchTypes";

import type { IntelCoverageLevel, MarketGapItem } from "@shared/intelligenceTypes";

import { toast } from "sonner";

import { getDashboardPath } from "@/config/dashboardNav";

import { formatDistanceToNow } from "date-fns";



const SUGGESTED_NICHES = [

  "eco-friendly phone accessories",

  "pet grooming gadgets",

  "home office ergonomics",

  "travel organization",

];



const CONFIDENCE_LABELS: Record<IntelCoverageLevel, string> = {

  high: "High",

  medium: "Medium",

  low: "Low",

};



/** AI gap ideas have no retail price — profit tools need a real product from Discover. */

function gapToProduct(gap: MarketGapItem): ProductSearchResult {

  return {

    id: `gap-${gap.title.slice(0, 40)}`,

    title: gap.title,

    price: 0,

    platform: "suggestion",

    image: null,

    shippingDays: null,

    supplier: null,

    rating: null,

    sourceUrl: null,

    category: "opportunity",

  };

}



export default function MarketGapFinder() {

  const [, setLocation] = useLocation();

  const [niche, setNiche] = useState("");

  const [detailProduct, setDetailProduct] = useState<ProductSearchResult | null>(null);

  const [drawerTab, setDrawerTab] = useState<ProductDrawerTab>("validate");

  const utils = trpc.useUtils();

  const aiConfig = trpc.system.getConfig.useQuery();

  const findGapsMutation = trpc.marketgap.findGaps.useMutation();



  const addToPipeline = trpc.pipeline.createPipelineItem.useMutation({

    onSuccess: async () => {

      await utils.pipeline.getPipelineItems.invalidate();

      toast.success("Opportunity added to pipeline");

    },

    onError: (err) => toast.error(err.message),

  });



  const handleFindGaps = async () => {

    if (!niche.trim()) return;

    try {

      await findGapsMutation.mutateAsync({

        niche: niche.trim(),

        platforms: ["amazon", "ebay", "tiktok", "shopify"],

      });

    } catch (err) {

      toast.error(err instanceof Error ? err.message : "Failed to find market gaps");

    }

  };



  const openGap = (gap: MarketGapItem, tab: ProductDrawerTab) => {

    setDetailProduct(gapToProduct(gap));

    setDrawerTab(tab);

  };



  const gaps = (findGapsMutation.data?.gaps ?? []) as MarketGapItem[];

  const intelContext = findGapsMutation.data?.intelContext;

  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);



  return (

    <div className="space-y-8">

      <PageHeader

        title="Market Gap Finder"

        description="Surface underserved niches with high demand and manageable competition — AI suggestions, not live catalog data."

      />

      {gaps.length > 0 ? (
        <div className="flex justify-end">
          <DataFreshnessBadge synthetic />
        </div>
      ) : null}



      <AiFeatureGate disabled={aiDisabled} feature="Market gap analysis" />



      {findGapsMutation.error ? (

        <Alert variant="destructive">

          <AlertDescription>{findGapsMutation.error.message}</AlertDescription>

        </Alert>

      ) : null}



      <FormSection

        title="Niche to analyze"

        description="Describe a category or audience — AI compares demand vs supply across major platforms."

        icon={BarChart3}

        footer={

          <Button onClick={handleFindGaps} disabled={findGapsMutation.isPending || aiDisabled}>

            {findGapsMutation.isPending ? (

              <>

                <Spinner className="w-4 h-4" />

                Analyzing…

              </>

            ) : (

              <>

                <Sparkles className="w-4 h-4" />

                Find gaps

              </>

            )}

          </Button>

        }

      >

        <Input

          placeholder="e.g. eco-friendly phone accessories"

          value={niche}

          onChange={(e) => setNiche(e.target.value)}

          className="input-elegant"

        />

        <div className="flex flex-wrap gap-2">

          {SUGGESTED_NICHES.map((n) => (

            <button

              key={n}

              type="button"

              onClick={() => setNiche(n)}

              className="text-xs rounded-full border border-border px-3 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"

            >

              {n}

            </button>

          ))}

        </div>

      </FormSection>



      {intelContext ? (

        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">

          <div className="flex flex-wrap items-center gap-2">

            <p className="text-xs font-medium text-muted-foreground">Evidence context</p>

            <Badge variant="secondary" className="text-[10px]">

              Coverage: {CONFIDENCE_LABELS[intelContext.coverage]}

            </Badge>

            {intelContext.trendFetchedAt ? (

              <DataFreshnessBadge

                dataMode="cached"

                cachedAt={intelContext.trendFetchedAt}

                stale={intelContext.trendStale}

              />

            ) : null}

            {intelContext.adsFetchedAt ? (

              <DataFreshnessBadge

                dataMode="cached"

                cachedAt={intelContext.adsFetchedAt}

                stale={intelContext.adsStale}

              />

            ) : null}

          </div>

          <p className="text-xs text-muted-foreground whitespace-pre-line">{intelContext.summary}</p>

          {intelContext.trendFetchedAt ? (

            <p className="text-[10px] text-muted-foreground">

              Trends{" "}

              {formatDistanceToNow(new Date(intelContext.trendFetchedAt), { addSuffix: true })}

              {intelContext.trendStale ? " (stale cache)" : ""}

              {intelContext.adsFetchedAt

                ? ` · Ads ${formatDistanceToNow(new Date(intelContext.adsFetchedAt), { addSuffix: true })}${intelContext.adsStale ? " (stale cache)" : ""}`

                : ""}

            </p>

          ) : null}

        </div>

      ) : null}



      <div className="space-y-4">

        {gaps.length === 0 && !findGapsMutation.isPending ? (

          <div className="product-panel-empty">

            <div className="product-panel-empty-icon">

              <BarChart3 className="w-5 h-5 text-primary" />

            </div>

            <p className="font-medium text-sm">No gaps analyzed yet</p>

            <p className="text-sm text-muted-foreground max-w-md mx-auto">

              Enter a niche above to discover product opportunities with estimated margins and competition levels.

            </p>

          </div>

        ) : null}



        {gaps.map((gap, idx) => (

          <article key={idx} className="card-elevated p-5 sm:p-6 surface-interactive">

            <div className="flex items-start justify-between mb-4 gap-4">

              <div className="min-w-0 space-y-2">

                <div className="flex flex-wrap items-center gap-2">

                  <Badge variant="outline" className="text-[10px] gap-1">

                    <Sparkles className="w-3 h-3" />

                    AI-generated suggestion

                  </Badge>

                  <Badge variant="secondary" className="text-[10px]">

                    Confidence: {CONFIDENCE_LABELS[gap.confidence ?? "medium"]}

                  </Badge>

                </div>

                <h3 className="font-display text-base font-semibold">{gap.title}</h3>

                <p className="text-sm text-muted-foreground leading-relaxed">{gap.opportunity}</p>

              </div>

              <Badge

                className={

                  gap.demand_level?.toLowerCase().includes("high")

                    ? "bg-success/10 text-success border-success/20 shrink-0"

                    : "bg-warning/10 text-warning border-warning/20 shrink-0"

                }

              >

                {gap.demand_level?.toLowerCase().includes("high") ? (

                  <TrendingUp className="w-3 h-3 mr-1" />

                ) : (

                  <AlertCircle className="w-3 h-3 mr-1" />

                )}

                {gap.demand_level}

              </Badge>

            </div>



            <div className="grid sm:grid-cols-2 gap-3 mb-4">

              <InsightCard title="Competition" icon={BarChart3} className="!p-4 !shadow-none border">

                {gap.competition_level}

              </InsightCard>

              <InsightCard title="Est. margin" icon={TrendingUp} className="!p-4 !shadow-none border">

                <span className="text-success font-medium">{gap.estimated_margin}</span>

              </InsightCard>

            </div>



            <div className="flex flex-wrap gap-2">

              <Button size="sm" onClick={() => openGap(gap, "validate")}>

                <ShieldCheck className="w-3.5 h-3.5" />

                Validate

              </Button>

              <Button

                size="sm"

                variant="outline"

                onClick={() => setLocation(`${getDashboardPath("search")}?q=${encodeURIComponent(gap.title)}`)}

              >

                <Search className="w-3.5 h-3.5" />

                Search in Discover

              </Button>

            </div>

          </article>

        ))}

      </div>



      <ProductDetailDrawer

        product={detailProduct}

        open={Boolean(detailProduct)}

        onOpenChange={(open) => !open && setDetailProduct(null)}

        initialTab={drawerTab}

        onAddToPipeline={(product) =>

          addToPipeline.mutate({

            productTitle: product.title,

            platform: product.platform,

            price: product.price > 0 ? product.price : undefined,

            stage: "testing",

            notes: "From market gap finder (AI suggestion)",

          })

        }

        pipelinePending={addToPipeline.isPending}

      />

    </div>

  );

}


