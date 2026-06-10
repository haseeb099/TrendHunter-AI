import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";
import { FormSection } from "@/components/workspace/FormSection";
import { InsightCard } from "@/components/workspace/InsightCard";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import { TrendPulsePanel } from "@/components/intelligence/TrendPulsePanel";
import { AdRadarPanel } from "@/components/intelligence/AdRadarPanel";
import {
  Users,
  TrendingDown,
  BarChart3,
  DollarSign,
  AlertCircle,
  Target,
  ShieldAlert,
  Zap,
  Megaphone,
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
  const [live, setLive] = useState(false);
  const [mainTab, setMainTab] = useState("intel");

  const aiConfig = trpc.system.getConfig.useQuery();
  const analyzeMutation = trpc.competitor.analyzeCompetitor.useMutation();
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);
  const autoAnalyzeRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kw = params.get("keyword")?.trim();
    if (!kw) return;
    setKeyword(kw);
    if (autoAnalyzeRef.current || aiConfig.isLoading || aiDisabled) return;
    autoAnalyzeRef.current = true;
    void analyzeMutation
      .mutateAsync({ keyword: kw, live })
      .then(() => setMainTab("intel"))
      .catch((err) => {
        autoAnalyzeRef.current = false;
        toast.error(err instanceof Error ? err.message : "Analysis failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link analyze
  }, [location, aiConfig.isLoading, aiDisabled, live]);

  const handleAnalyze = async () => {
    if ((!url.trim() && !keyword.trim()) || aiDisabled) return;
    try {
      await analyzeMutation.mutateAsync({
        url: url.trim(),
        keyword: keyword.trim() || undefined,
        live,
      });
      setMainTab("intel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    }
  };

  const analysis = analyzeMutation.data?.analysis as CompetitorAnalysis | undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Competitor Intelligence"
        description="Google Trends, Meta Ad Library, and AI analysis — cached daily, live refresh with credits."
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
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex items-center gap-2">
              <Switch id="comp-live" checked={live} onCheckedChange={setLive} />
              <Label htmlFor="comp-live" className="text-xs flex items-center gap-1 cursor-pointer">
                <Zap className="w-3.5 h-3.5" />
                Live report (3 credits)
              </Label>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={
                analyzeMutation.isPending || aiDisabled || (!url.trim() && !keyword.trim())
              }
              className="w-full sm:w-auto sm:ml-auto"
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
          </div>
        }
      >
        <FieldLabel htmlFor="comp-url">Store URL (optional)</FieldLabel>
        <Input
          id="comp-url"
          placeholder="https://competitor-store.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input-elegant"
        />
        <FieldLabel htmlFor="comp-keyword">Keyword focus</FieldLabel>
        <Input
          id="comp-keyword"
          placeholder="e.g. portable blender"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="input-elegant"
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {SUGGESTED_KEYWORDS.map((kw) => (
            <Button key={kw} type="button" size="sm" variant="outline" onClick={() => setKeyword(kw)}>
              {kw}
            </Button>
          ))}
        </div>
      </FormSection>

      {keyword.trim() ? (
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="intel">AI intel</TabsTrigger>
            <TabsTrigger value="trends">
              <BarChart3 className="w-4 h-4 mr-1" />
              Trend Pulse
            </TabsTrigger>
            <TabsTrigger value="ads">
              <Megaphone className="w-4 h-4 mr-1" />
              Ad Radar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-6">
            <div className="card-elevated p-5 sm:p-6">
              <TrendPulsePanel keyword={keyword} />
            </div>
          </TabsContent>

          <TabsContent value="ads" className="mt-6">
            <div className="card-elevated p-5 sm:p-6">
              <AdRadarPanel keyword={keyword} />
            </div>
          </TabsContent>

          <TabsContent value="intel" className="mt-6 space-y-4">
            {analysis ? (
              <>
                {analysis.position ? (
                  <InsightCard title="Market position" icon={Target}>
                    <p className="text-sm text-muted-foreground leading-relaxed">{analysis.position}</p>
                  </InsightCard>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <InsightCard title="Pricing" icon={DollarSign}>
                    <p className="text-sm">{analysis.pricing ?? "—"}</p>
                  </InsightCard>
                  <InsightCard title="Sales velocity" icon={BarChart3}>
                    <p className="text-sm capitalize">{analysis.salesVelocity ?? "—"}</p>
                  </InsightCard>
                  <InsightCard title="Review sentiment" icon={Users}>
                    <p className="text-sm capitalize">{analysis.reviewSentiment ?? "—"}</p>
                  </InsightCard>
                  <InsightCard title="Est. ad spend" icon={TrendingDown}>
                    <p className="text-sm">{analysis.adSpend ?? "—"}</p>
                  </InsightCard>
                </div>

                {analysis.topProducts?.length ? (
                  <InsightCard title="Top products" icon={Target}>
                    <ul className="text-sm space-y-1">
                      {analysis.topProducts.map((p) => (
                        <li key={p}>• {p}</li>
                      ))}
                    </ul>
                  </InsightCard>
                ) : null}

                {analysis.gaps?.length ? (
                  <InsightCard title="Market gaps" icon={AlertCircle}>
                    <ul className="text-sm space-y-1">
                      {analysis.gaps.map((g) => (
                        <li key={g}>• {g}</li>
                      ))}
                    </ul>
                  </InsightCard>
                ) : null}

                {analysis.threats?.length ? (
                  <InsightCard title="Threats" icon={ShieldAlert}>
                    <ul className="text-sm space-y-1">
                      {analysis.threats.map((t) => (
                        <li key={t}>• {t}</li>
                      ))}
                    </ul>
                  </InsightCard>
                ) : null}

                {analyzeMutation.data?.creditsUsed ? (
                  <Badge variant="outline">Used {analyzeMutation.data.creditsUsed} credits</Badge>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run analysis above to combine AI intel with cached trend and ad data.
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
