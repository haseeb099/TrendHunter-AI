import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { Users, TrendingDown, BarChart3, DollarSign, AlertCircle, Target } from "lucide-react";
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

export default function CompetitorSpy() {
  const [location] = useLocation();
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");

  const aiConfig = trpc.system.getConfig.useQuery();
  const analyzeMutation = trpc.competitor.analyzeCompetitor.useMutation();
  const aiDisabled = aiConfig.data && !aiConfig.data.ai.configured;

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
    <div className="space-y-6">
      <PageHeader
        title="Competitor Spy"
        description="Analyze competitor listings, pricing, and strategies with marketplace context"
      />

      {analyzeMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{analyzeMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {aiDisabled ? (
        <Alert>
          <AlertDescription>Add OPENAI_API_KEY to enable competitor analysis.</AlertDescription>
        </Alert>
      ) : null}

      <Card className="card-elevated p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Competitor Store URL</label>
            <Input
              placeholder="https://example-store.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-elegant"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Or Search Keyword</label>
            <Input
              placeholder="Product keyword to analyze..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="input-elegant"
            />
          </div>
          <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending || aiDisabled}>
            {analyzeMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Analyze Competitor
              </>
            )}
          </Button>
        </div>
      </Card>

      {analysis && (
        <div className="space-y-4 animate-in">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Pricing Strategy</h3>
              </div>
              <p className="text-muted-foreground text-sm">{analysis.pricing}</p>
            </Card>
            <Card className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Market Position</h3>
              </div>
              <p className="text-muted-foreground text-sm">{analysis.position}</p>
              <Badge variant="outline" className="mt-3">
                Sentiment: {analysis.reviewSentiment}
              </Badge>
            </Card>
            <Card className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Sales Velocity</h3>
              </div>
              <p className="text-muted-foreground text-sm">{analysis.salesVelocity}</p>
              {analysis.adSpend ? (
                <p className="text-xs text-muted-foreground mt-2">Est. ad spend: {analysis.adSpend}</p>
              ) : null}
            </Card>
            <Card className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Top Products</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {(analysis.topProducts ?? []).map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </Card>
          </div>

          {analysis.gaps && analysis.gaps.length > 0 ? (
            <Card className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Market Gaps</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                {analysis.gaps.map((g, i) => (
                  <li key={i}>• {g}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          {analysis.threats && analysis.threats.length > 0 ? (
            <Card className="card-elevated p-6 border-destructive/20">
              <h3 className="font-semibold mb-3">Threats</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {analysis.threats.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
