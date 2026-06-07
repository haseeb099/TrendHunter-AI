import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

export default function ProductValidation() {
  const [productTitle, setProductTitle] = useState("");
  const [platform, setPlatform] = useState("amazon");
  const [price, setPrice] = useState(0);

  const validateMutation = trpc.validate.validateProduct.useMutation();

  const handleValidate = async () => {
    if (!productTitle.trim()) return;
    await validateMutation.mutateAsync({ productTitle, platform, price });
  };

  const validation = validateMutation.data;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">AI Product Validation</h1>
        <p className="text-muted-foreground">Score products on viability and market potential</p>
      </div>

      {/* Input Form */}
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
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="input-elegant w-full"
              >
                <option value="amazon">Amazon</option>
                <option value="ebay">eBay</option>
                <option value="shopify">Shopify</option>
                <option value="tiktok">TikTok Shop</option>
              </select>
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
                onClick={handleValidate}
                disabled={validateMutation.isPending}
                className="btn-primary w-full"
              >
                {validateMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Validate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Validation Results */}
      {validation && (
        <div className="space-y-6 animate-in">
          {/* Overall Score */}
          <Card className="card-elevated p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Overall Viability Score</h2>
              <div className={`text-5xl font-bold ${getScoreColor(validation.overallScore)}`}>
                {validation.overallScore}
              </div>
            </div>
            <Progress value={validation.overallScore} className="h-3" />
            <p className="text-muted-foreground mt-4">{validation.reasoning}</p>
          </Card>

          {/* Score Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { label: "Trend Score", value: validation.trendScore, icon: TrendingUp },
              { label: "Saturation Score", value: validation.saturationScore, icon: AlertCircle },
              { label: "Profit Potential", value: validation.profitPotential, icon: CheckCircle },
              { label: "Supplier Reliability", value: validation.supplierReliability, icon: CheckCircle },
            ].map((metric, idx) => (
              <Card key={idx} className="card-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <metric.icon className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{metric.label}</span>
                  </div>
                  <span className={`text-2xl font-bold ${getScoreColor(metric.value)}`}>
                    {metric.value}
                  </span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </Card>
            ))}
          </div>

          {/* Recommendations */}
          <Card className="card-elevated p-6">
            <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
            <ul className="space-y-3">
              {validation.overallScore >= 75 && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>This product shows strong potential. Consider adding to your pipeline.</span>
                </li>
              )}
              {validation.trendScore >= 75 && (
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Demand is trending upward. Good timing for market entry.</span>
                </li>
              )}
              {validation.saturationScore < 50 && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Market is not saturated. Less competition expected.</span>
                </li>
              )}
              {validation.profitPotential >= 75 && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Strong profit margins expected with proper pricing strategy.</span>
                </li>
              )}
            </ul>
          </Card>
        </div>
      )}

      {!validation && (
        <Card className="card-elevated p-12 text-center">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Enter product details and click Validate to get started</p>
        </Card>
      )}
    </div>
  );
}
