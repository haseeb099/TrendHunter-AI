import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { pickValidationScores, type ProductValidationResult } from "./types";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";

type ProductValidationPanelProps = {
  productTitle: string;
  platform: string;
  price: number;
  compact?: boolean;
  autoRun?: boolean;
  onAddToPipeline?: (payload: {
    validation: ProductValidationResult;
    productTitle: string;
    platform: string;
    price: number;
  }) => void;
  pipelinePending?: boolean;
};

function scoreTone(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export function ProductValidationPanel({
  productTitle,
  platform,
  price,
  compact = false,
  autoRun = false,
  onAddToPipeline,
  pipelinePending,
}: ProductValidationPanelProps) {
  const utils = trpc.useUtils();
  const aiConfig = trpc.system.getConfig.useQuery();
  const validateMutation = trpc.validate.validateProduct.useMutation({
    onSuccess: (data) => {
      if (data.creditsUsed && data.creditsUsed > 0) {
        void utils.credits.getWallet.invalidate();
      }
    },
  });
  const aiDisabled = aiConfig.data && !aiConfig.data.ai.configured;

  const handleValidate = async () => {
    if (!productTitle.trim() || aiDisabled) return;
    try {
      await validateMutation.mutateAsync({ productTitle, platform, price });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Validation failed");
    }
  };

  const response = validateMutation.data;
  const validation = pickValidationScores(response);

  useEffect(() => {
    if (autoRun && productTitle.trim() && !aiDisabled && !validation && !validateMutation.isPending) {
      void handleValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when autoRun enabled
  }, [autoRun, productTitle, platform, price, aiDisabled]);

  if (aiDisabled) {
    return (
      <Alert>
        <AlertDescription>Add OPENAI_API_KEY to run AI product validation.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {validateMutation.isPending && !validation ? (
        <div className="product-panel-empty">
          <Spinner className="w-8 h-8 mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing product viability…</p>
        </div>
      ) : null}

      {!validation && !validateMutation.isPending ? (
        <div className="product-panel-empty">
          <div className="product-panel-empty-icon">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-display font-semibold text-base">AI viability check</h4>
          <p className="text-sm text-muted-foreground text-balance max-w-xs mx-auto">
            Score trend, saturation, margins, and supplier reliability — enriched with cached trend
            and ad data.
          </p>
          <Button
            onClick={handleValidate}
            disabled={validateMutation.isPending}
            className="mt-2"
          >
            {validateMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Analyzing…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run validation
              </>
            )}
          </Button>
        </div>
      ) : null}

      {validateMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{validateMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {validation ? (
        <div className="space-y-4 fade-up">
          {response?.trendSignal || response?.adSnapshot ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Market context (cached)</p>
              <div className="flex flex-wrap gap-2">
                {response.trendSignal ? (
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {response.trendSignal.momentumLabel} · score{" "}
                    {Math.round(response.trendSignal.momentumScore)}
                    {response.trendSignal.stale ? " · stale" : ""}
                  </Badge>
                ) : null}
                {response.adSnapshot ? (
                  <Badge variant="outline" className="text-[10px]">
                    <Megaphone className="w-3 h-3 mr-1" />
                    {response.adSnapshot.activeAdCount} active ads
                    {response.adSnapshot.stale ? " · stale" : ""}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="product-score-hero">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                    Viability score
                  </p>
                  <DataFreshnessBadge synthetic />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{validation.reasoning}</p>
              </div>
              <div className={`font-display text-4xl font-bold tabular-nums ${scoreTone(validation.overallScore)}`}>
                {validation.overallScore}
              </div>
            </div>
            <Progress value={validation.overallScore} className="h-2 mt-4" />
            {onAddToPipeline ? (
              <Button
                size="sm"
                className="mt-4 w-full"
                disabled={pipelinePending}
                onClick={() =>
                  onAddToPipeline({
                    validation,
                    productTitle,
                    platform,
                    price,
                  })
                }
              >
                {pipelinePending ? (
                  <Spinner className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add to pipeline with score
              </Button>
            ) : null}
          </div>

          <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2"}`}>
            {(
              [
                { key: "trendScore" as const, label: "Trend", icon: TrendingUp },
                { key: "saturationScore" as const, label: "Saturation", icon: AlertCircle },
                { key: "profitPotential" as const, label: "Profit", icon: CheckCircle },
                { key: "supplierReliability" as const, label: "Supplier", icon: CheckCircle },
              ] as const
            ).map((metric) => (
              <div key={metric.label} className="product-metric-tile">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <metric.icon className="w-3.5 h-3.5" />
                    {metric.label}
                  </div>
                  <span
                    className={`text-lg font-bold tabular-nums ${scoreTone(validation[metric.key])}`}
                  >
                    {validation[metric.key]}
                  </span>
                </div>
                <Progress value={validation[metric.key]} className="h-1.5" />
                {validation.dimensionReasoning?.[metric.key] ? (
                  <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                    {validation.dimensionReasoning[metric.key]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {validation.overallScore >= 75 ? (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Strong potential — good candidate for your pipeline.</span>
              </div>
            ) : null}
            {validation.saturationScore < 50 ? (
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  Low competition
                </Badge>
                <span className="text-muted-foreground">Market is not heavily saturated.</span>
              </div>
            ) : null}
          </div>

          <Button variant="outline" size="sm" onClick={handleValidate} disabled={validateMutation.isPending}>
            Re-run validation
          </Button>
        </div>
      ) : null}
    </div>
  );
}
