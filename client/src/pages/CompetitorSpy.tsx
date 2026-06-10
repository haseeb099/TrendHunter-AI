import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";
import { FormSection } from "@/components/workspace/FormSection";
import { InsightCard } from "@/components/workspace/InsightCard";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import {
  Users,
  TrendingDown,
  BarChart3,
  DollarSign,
  AlertCircle,
  Target,
  ShieldAlert,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "wouter";
import { toast } from "sonner";

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

const SUGGESTED_KEYWORDS = ["wireless earbuds", "pet grooming", "led desk lamp", "portable blender"];

export default function CompetitorSpy() {
  const [location] = useLocation();
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");

  const aiConfig = trpc.system.getConfig.useQuery();
  const analyzeMutation = trpc.competitor.analyzeCompetitor.useMutation();
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kw = params.get("keyword");
    if (kw) setKeyword(kw);
  }, [location]);

  const handleAnalyze = async () => {
    if ((!url.trim() && !keyword.trim()) || aiDisabled) return;
    try {
      await analyzeMutation.mutateAsync({ url: url.trim(), keyword: keyword.trim() || undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    }
  };

  const analysis = analyzeMutation.data?.analysis as CompetitorAnalysis | undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Competitor Intelligence"
        description="Analyze stores and keywords — pricing, velocity, gaps, and threats. Also available per product in Discover."
      />

      <AiFeatureGate disabled={aiDisabled} feature="Competitor analysis" />

      {analyzeMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{analyzeMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection
        title="Analyze a competitor"
        description="Paste a store URL or enter a product keyword from your niche."
        icon={Users}
        footer={
          <Button
            onClick={handleAnalyze}
            disabled={
              analyzeMutation.isPending || aiDisabled || (!url.trim() && !keyword.trim())
            }
            className="w-full sm:w-auto"
          >
            {analyzeMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4" />
                Analyzing…
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Run analysis
              </>
            )}
          </Button>
        }
      >
        <div className="space-y-2">
          <FieldLabel htmlFor="comp-url">Store URL</FieldLabel>
          <Input
            id="comp-url"
            placeholder="https://competitor-store.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input-elegant"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="comp-kw" hint="Or analyze by keyword instead of URL">
            Product keyword
          </FieldLabel>
          <Input
            id="comp-kw"
            placeholder="e.g. portable neck fan"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input-elegant"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {SUGGESTED_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => setKeyword(kw)}
              className="text-xs rounded-full border border-border px-3 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      </FormSection>

      {analysis ? (
        <div className="space-y-6 fade-up">
          <div className="grid md:grid-cols-2 gap-4">
            <InsightCard title="Pricing strategy" icon={DollarSign}>
              {analysis.pricing ?? "—"}
            </InsightCard>
            <InsightCard
              title="Market position"
              icon={BarChart3}
              badge={
                analysis.reviewSentiment ? (
                  <Badge variant="outline" className="text-xs">
                    {analysis.reviewSentiment}
                  </Badge>
                ) : null
              }
            >
              {analysis.position ?? "—"}
            </InsightCard>
            <InsightCard title="Sales velocity" icon={TrendingDown}>
              {analysis.salesVelocity ?? "—"}
              {analysis.adSpend ? (
                <p className="text-xs mt-2 opacity-80">Est. ad spend: {analysis.adSpend}</p>
              ) : null}
            </InsightCard>
            <InsightCard title="Top products" icon={Target}>
              <ul className="space-y-1">
                {(analysis.topProducts ?? []).map((p, i) => (
                  <li key={i}>· {p}</li>
                ))}
              </ul>
            </InsightCard>
          </div>

          {analysis.gaps && analysis.gaps.length > 0 ? (
            <InsightCard title="Market gaps you can exploit" icon={AlertCircle}>
              <ul className="space-y-2">
                {analysis.gaps.map((g, i) => (
                  <li key={i}>· {g}</li>
                ))}
              </ul>
            </InsightCard>
          ) : null}

          {analysis.threats && analysis.threats.length > 0 ? (
            <InsightCard title="Threats to watch" icon={ShieldAlert} className="border-destructive/20">
              <ul className="space-y-1">
                {analysis.threats.map((t, i) => (
                  <li key={i}>· {t}</li>
                ))}
              </ul>
            </InsightCard>
          ) : null}
        </div>
      ) : (
        <div className="product-panel-empty">
          <div className="product-panel-empty-icon">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="font-medium text-sm">No analysis yet</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Enter a competitor URL or keyword above. For single products, use the Competitors tab in Discover.
          </p>
        </div>
      )}
    </div>
  );
}
