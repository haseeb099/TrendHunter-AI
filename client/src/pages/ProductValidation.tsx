import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";
import { FormSection } from "@/components/workspace/FormSection";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import { ProductValidationPanel } from "@/components/product-workspace/ProductValidationPanel";
import { Zap, Compass } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getDashboardPath } from "@/config/dashboardNav";

export default function ProductValidation() {
  const [location, setLocation] = useLocation();
  const [productTitle, setProductTitle] = useState("");
  const [platform, setPlatform] = useState("amazon");
  const [price, setPrice] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const aiConfig = trpc.system.getConfig.useQuery();
  const utils = trpc.useUtils();
  const addToPipeline = trpc.pipeline.createPipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Added to pipeline with validation score");
    },
    onError: (err) => toast.error(err.message),
  });
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title");
    const plat = params.get("platform");
    const p = params.get("price");
    if (title) setProductTitle(title);
    if (plat) setPlatform(plat);
    if (p) setPrice(Number(p));
  }, [location]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Product Validation"
        description="Score trend momentum, saturation, margin potential, and supplier reliability — or validate inline from Discover."
        actions={
          <Button variant="outline" size="sm" onClick={() => setLocation(getDashboardPath("search"))}>
            <Compass className="w-4 h-4" />
            Open Discover
          </Button>
        }
      />

      <AiFeatureGate disabled={aiDisabled} feature="Product validation" />

      <FormSection
        title="Product to validate"
        description="Fields auto-fill when you arrive from a product card or watchlist."
        icon={Zap}
        footer={
          <Button
            onClick={() => setShowResults(true)}
            disabled={!productTitle.trim() || aiDisabled}
            className="w-full sm:w-auto"
          >
            <Zap className="w-4 h-4" />
            Run validation
          </Button>
        }
      >
        <FieldLabel htmlFor="val-title">Product title</FieldLabel>
        <Input
          id="val-title"
          placeholder="e.g. Magnetic phone mount"
          value={productTitle}
          onChange={(e) => {
            setProductTitle(e.target.value);
            setShowResults(false);
          }}
          className="input-elegant"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldLabel>Target marketplace</FieldLabel>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-full input-elegant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amazon">Amazon</SelectItem>
                <SelectItem value="ebay">eBay</SelectItem>
                <SelectItem value="shopify">Shopify / Retail</SelectItem>
                <SelectItem value="tiktok">TikTok Shop</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="val-price">Selling price ($)</FieldLabel>
            <Input
              id="val-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="input-elegant"
            />
          </div>
        </div>
      </FormSection>

      {showResults && productTitle.trim() ? (
        <section className="card-elevated p-5 sm:p-6">
          <ProductValidationPanel
            key={`${productTitle}-${platform}-${price}`}
            productTitle={productTitle}
            platform={platform}
            price={price}
            autoRun
            pipelinePending={addToPipeline.isPending}
            onAddToPipeline={({ validation, productTitle, platform, price }) =>
              addToPipeline.mutate({
                productTitle,
                platform,
                price,
                validationScore: validation.overallScore,
                stage: validation.overallScore >= 75 ? "scaling" : "testing",
                notes: `AI validation: trend ${validation.trendScore}, saturation ${validation.saturationScore}`,
              })
            }
          />
        </section>
      ) : (
        <div className="product-panel-empty">
          <div className="product-panel-empty-icon">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <p className="font-medium text-sm">Ready to score a product</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter details above, or open any product in Discover and use the Validate tab in the side panel.
          </p>
        </div>
      )}
    </div>
  );
}
