import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import type { ProductDrawerTab } from "@/components/product-workspace/types";
import { BarChart3, TrendingUp, AlertCircle, Sparkles, ShieldCheck, Search } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ProductSearchResult } from "@shared/searchTypes";
import { toast } from "sonner";

type GapItem = {
  title: string;
  opportunity: string;
  demand_level: string;
  competition_level: string;
  estimated_margin: string;
};

function gapToProduct(gap: GapItem): ProductSearchResult {
  const marginMatch = gap.estimated_margin?.match(/[\d.]+/);
  const price = marginMatch ? Number(marginMatch[0]) : 25;
  return {
    id: `gap-${gap.title.slice(0, 40)}`,
    title: gap.title,
    price: Number.isFinite(price) ? price : 25,
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
    await findGapsMutation.mutateAsync({
      niche: niche.trim(),
      platforms: ["amazon", "ebay", "tiktok", "shopify"],
    });
  };

  const openGap = (gap: GapItem, tab: ProductDrawerTab) => {
    setDetailProduct(gapToProduct(gap));
    setDrawerTab(tab);
  };

  const gaps = (findGapsMutation.data?.gaps ?? []) as GapItem[];
  const aiDisabled = aiConfig.data && !aiConfig.data.ai.configured;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Gap Finder"
        description="Discover underserved niches with high demand and low supply"
      />

      {aiDisabled ? (
        <Alert>
          <AlertDescription>
            AI features require OPENAI_API_KEY in your server .env — see docs/API-ENV-SETUP.md
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="card-elevated p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Enter niche (e.g., eco-friendly phone accessories)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="input-elegant flex-1"
          />
          <Button onClick={handleFindGaps} disabled={findGapsMutation.isPending || aiDisabled}>
            {findGapsMutation.isPending ? (
              <Spinner className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Find gaps
          </Button>
        </div>
      </Card>

      {findGapsMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{findGapsMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        {gaps.length === 0 && !findGapsMutation.isPending ? (
          <Card className="card-elevated p-12 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Enter a niche and run AI analysis to surface market gaps.
          </Card>
        ) : null}

        {gaps.map((gap, idx) => (
          <Card key={idx} className="card-elevated p-6 surface-interactive">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold mb-2">{gap.title}</h3>
                <p className="text-sm text-muted-foreground">{gap.opportunity}</p>
              </div>
              <Badge
                className={
                  gap.demand_level?.toLowerCase().includes("high")
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
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
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="product-metric-tile">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Competition
                </p>
                <p className="font-semibold">{gap.competition_level}</p>
              </div>
              <div className="product-metric-tile">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Est. margin
                </p>
                <p className="font-semibold text-success">{gap.estimated_margin}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="default" onClick={() => openGap(gap, "validate")}>
                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                Validate here
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLocation(`/dashboard?q=${encodeURIComponent(gap.title)}`);
                }}
              >
                <Search className="w-3.5 h-3.5 mr-2" />
                Search products
              </Button>
            </div>
          </Card>
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
