import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { ProductValidationPanel } from "@/components/product-workspace/ProductValidationPanel";
import { Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ProductValidation() {
  const [location] = useLocation();
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
  const aiDisabled = aiConfig.data && !aiConfig.data.ai.configured;

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
    <div className="space-y-6">
      <PageHeader
        title="AI Product Validation"
        description="Score products on viability and market potential — or validate inline from Discover"
      />

      {aiDisabled ? (
        <Alert>
          <AlertDescription>Add OPENAI_API_KEY to run AI product validation.</AlertDescription>
        </Alert>
      ) : null}

      <Card className="card-elevated p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Product Title</label>
            <Input
              placeholder="Enter product name..."
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              className="input-elegant"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-full">
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

            <div>
              <label className="text-sm font-semibold mb-2 block">Price ($)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="input-elegant"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => setShowResults(true)}
                disabled={!productTitle.trim() || aiDisabled}
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                Load validation
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {showResults && productTitle.trim() ? (
        <Card className="card-elevated p-6">
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
                estimatedProfit:
                  price > 0 && validation.profitPotential
                    ? (price * validation.profitPotential) / 100
                    : undefined,
                stage: validation.overallScore >= 75 ? "scaling" : "testing",
                notes: `AI validation: trend ${validation.trendScore}, saturation ${validation.saturationScore}`,
              })
            }
          />
        </Card>
      ) : (
        <Card className="card-elevated p-12 text-center">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Enter product details above, or open any product from Discover and use the Validate tab in
            the side panel.
          </p>
        </Card>
      )}
    </div>
  );
}
