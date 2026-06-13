import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Target, Users, TrendingDown, BarChart3 } from "lucide-react";

type CompetitorAnalysis = {
  pricing?: string;
  reviewSentiment?: string;
  salesVelocity?: string;
  adSpend?: string;
  topProducts?: string[];
  gaps?: string[];
  threats?: string[];
  position?: string;
};

type ProductCompetitorPanelProps = {
  keyword: string;
  sourceUrl?: string | null;
};

export function ProductCompetitorPanel({ keyword, sourceUrl }: ProductCompetitorPanelProps) {
  const aiConfig = trpc.system.getConfig.useQuery();
  const analyzeMutation = trpc.competitor.analyzeCompetitor.useMutation();
  const aiDisabled = aiConfig.data && !aiConfig.data.ai.configured;
  const [hasRun, setHasRun] = useState(false);

  const handleAnalyze = async () => {
    if ((!keyword.trim() && !sourceUrl?.trim()) || aiDisabled) return;
    try {
      const result = await analyzeMutation.mutateAsync({
        keyword: keyword.trim() || undefined,
        url: sourceUrl?.trim() || undefined,
      });
      setHasRun(true);
      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    }
  };

  const analysis = analyzeMutation.data?.analysis as CompetitorAnalysis | undefined;

  if (aiDisabled) {
    return (
      <Alert>
        <AlertDescription>Add OPENAI_API_KEY to enable competitor analysis.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!hasRun && !analysis ? (
        <div className="product-panel-empty">
          <div className="product-panel-empty-icon">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-display font-semibold text-base">Competitive landscape</h4>
          <p className="text-sm text-muted-foreground text-balance max-w-xs mx-auto">
            Analyze pricing, gaps, and positioning for &ldquo;{keyword}&rdquo; using live marketplace context.
          </p>
          <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
            {analyzeMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Analyzing…
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Analyze competitors
              </>
            )}
          </Button>
        </div>
      ) : null}

      {analyzeMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{analyzeMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {analysis ? (
        <div className="space-y-3 fade-up">
          {analysis.position ? (
            <div className="product-score-hero">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-1">
                Market position
              </p>
              <p className="text-sm leading-relaxed">{analysis.position}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {analysis.pricing ? (
              <div className="product-metric-tile">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Pricing
                </p>
                <p className="text-sm font-medium">{analysis.pricing}</p>
              </div>
            ) : null}
            {analysis.salesVelocity ? (
              <div className="product-metric-tile">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Velocity
                </p>
                <p className="text-sm font-medium capitalize">{analysis.salesVelocity}</p>
              </div>
            ) : null}
            {analysis.reviewSentiment ? (
              <div className="product-metric-tile">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Sentiment
                </p>
                <p className="text-sm font-medium capitalize">{analysis.reviewSentiment}</p>
              </div>
            ) : null}
            {analysis.adSpend ? (
              <div className="product-metric-tile">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Ad spend
                </p>
                <p className="text-sm font-medium">{analysis.adSpend}</p>
              </div>
            ) : null}
          </div>

          {analysis.gaps && analysis.gaps.length > 0 ? (
            <div className="rounded-xl border border-success/25 bg-success/5 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-success">Market gaps</p>
              <ul className="space-y-1.5">
                {analysis.gaps.map((gap, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-success">•</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {analysis.topProducts && analysis.topProducts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top competing products
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.topProducts.map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
            Refresh analysis
          </Button>
        </div>
      ) : null}
    </div>
  );
}
