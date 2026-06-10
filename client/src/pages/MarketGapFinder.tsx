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
import { BarChart3, TrendingUp, AlertCircle, Sparkles, ShieldCheck, Search } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ProductSearchResult } from "@shared/searchTypes";
import { toast } from "sonner";
import { getDashboardPath } from "@/config/dashboardNav";

type GapItem = {
  title: string;
  opportunity: string;
  demand_level: string;
  competition_level: string;
  estimated_margin: string;
};

const SUGGESTED_NICHES = [
  "eco-friendly phone accessories",
  "pet grooming gadgets",
  "home office ergonomics",
  "travel organization",
];

/** Market gaps lack retail price — use a neutral placeholder for profit/validation tools. */
const GAP_PLACEHOLDER_PRICE = 29.99;

function gapToProduct(gap: GapItem): ProductSearchResult {
  return {
    id: `gap-${gap.title.slice(0, 40)}`,
    title: gap.title,
    price: GAP_PLACEHOLDER_PRICE,
    platform: "amazon",
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

  const openGap = (gap: GapItem, tab: ProductDrawerTab) => {
    setDetailProduct(gapToProduct(gap));
    setDrawerTab(tab);
  };

  const gaps = (findGapsMutation.data?.gaps ?? []) as GapItem[];
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Market Gap Finder"
        description="Surface underserved niches with high demand and manageable competition — then validate or search products."
      />

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
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold mb-1.5">{gap.title}</h3>
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
            price: product.price,
            stage: "testing",
            notes: "From market gap finder",
          })
        }
        pipelinePending={addToPipeline.isPending}
      />
    </div>
  );
}
