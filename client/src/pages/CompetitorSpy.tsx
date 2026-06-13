import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { InsightCard } from "@/components/workspace/InsightCard";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import { ProductCard } from "@/components/ProductCard";
import { TrendPulsePanel } from "@/components/intelligence/TrendPulsePanel";
import { AdRadarPanel } from "@/components/intelligence/AdRadarPanel";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
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
  Store,
  LineChart,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { extractCompetitorSearchQuery } from "@shared/competitorUrl";
import { normalizeIntelKeyword } from "@shared/intelKeyword";
import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import type { AdLibrarySnapshot, TrendSignal } from "@shared/intelligenceTypes";
import { useTrendWindow } from "@/_core/hooks/useTrendWindow";

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

const REGIONS: { code: RegionCode; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "UK", label: "United Kingdom" },
  { code: "EU", label: "Europe" },
  { code: "GLOBAL", label: "Global" },
];

export default function CompetitorSpy() {
  const [location] = useLocation();
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState<RegionCode>("US");
  const [live, setLive] = useState(false);
  const [mainTab, setMainTab] = useState("intel");
  const { window: trendWindow } = useTrendWindow();

  const utils = trpc.useUtils();
  const aiConfig = trpc.system.getConfig.useQuery();
  const analyzeMutation = trpc.competitor.analyzeCompetitor.useMutation();
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);
  const autoAnalyzeRef = useRef(false);

  const hydrateIntelCache = useCallback(
    (result: {
      intelKeyword?: string;
      effectiveKeyword?: string;
      trendSignal?: TrendSignal | null;
      adSnapshot?: AdLibrarySnapshot | null;
      creditsUsed?: number;
    }) => {
      const intelKw =
        result.intelKeyword ??
        (result.effectiveKeyword ? normalizeIntelKeyword(result.effectiveKeyword) : "");
      if (!intelKw) return;

      if (result.trendSignal) {
        utils.intelligence.getTrendPulse.setData(
          { keyword: intelKw, region, live: false, timeframe: trendWindow },
          {
            signal: result.trendSignal,
            creditsUsed: result.creditsUsed ?? 0,
            region,
            configured: true,
            dataState: result.trendSignal.isLive ? "live" : result.trendSignal.stale ? "stale" : "cached",
            dataLabel: result.trendSignal.isLive
              ? "Live data"
              : result.trendSignal.stale
                ? "Stale cache"
                : "Cached data",
          }
        );
      }

      if (result.adSnapshot) {
        utils.intelligence.getAdRadar.setData(
          { keyword: intelKw, region, live: false },
          {
            snapshot: result.adSnapshot,
            creditsUsed: result.creditsUsed ?? 0,
            configured: true,
            dataState: result.adSnapshot.isLive ? "live" : result.adSnapshot.stale ? "stale" : "cached",
            dataLabel: result.adSnapshot.isLive
              ? "Live data"
              : result.adSnapshot.stale
                ? "Stale cache"
                : "Cached data",
          }
        );
      }
    },
    [region, trendWindow, utils.intelligence.getAdRadar, utils.intelligence.getTrendPulse]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kw = params.get("keyword")?.trim();
    const reg = params.get("region") as RegionCode | null;
    if (reg && REGIONS.some((r) => r.code === reg)) setRegion(reg);
    if (!kw) return;
    setKeyword(kw);
    if (autoAnalyzeRef.current || aiConfig.isLoading || aiDisabled) return;
    autoAnalyzeRef.current = true;
    void analyzeMutation
      .mutateAsync({ keyword: kw, region, live })
      .then((result) => {
        hydrateIntelCache(result);
        setMainTab("intel");
      })
      .catch((err) => {
        autoAnalyzeRef.current = false;
        toast.error(err instanceof Error ? err.message : "Analysis failed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link analyze
  }, [location, aiConfig.isLoading, aiDisabled, live]);

  const handleAnalyze = async () => {
    if ((!url.trim() && !keyword.trim()) || aiDisabled) return;
    try {
      const result = await analyzeMutation.mutateAsync({
        url: url.trim() || undefined,
        keyword: keyword.trim() || undefined,
        region,
        live,
      });
      if (result.effectiveKeyword && !keyword.trim()) {
        setKeyword(result.effectiveKeyword);
      }
      hydrateIntelCache(result);
      setMainTab("intel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    }
  };

  const analysis = analyzeMutation.data?.analysis as CompetitorAnalysis | undefined;
  const activeKeyword =
    keyword.trim() || analyzeMutation.data?.effectiveKeyword || "";
  const intelKeyword = useMemo(() => {
    if (analyzeMutation.data?.intelKeyword) return analyzeMutation.data.intelKeyword;
    if (activeKeyword) return normalizeIntelKeyword(activeKeyword) || activeKeyword;
    return "";
  }, [activeKeyword, analyzeMutation.data?.intelKeyword]);
  const competitorProducts = (analyzeMutation.data?.competitorProducts ??
    []) as ProductSearchResult[];
  const trendSeed = analyzeMutation.data?.trendSignal ?? null;
  const adSeed = analyzeMutation.data?.adSnapshot ?? null;
  const urlPreview = useMemo(() => {
    if (!url.trim() || keyword.trim()) return null;
    return extractCompetitorSearchQuery(url);
  }, [url, keyword]);

  const showResults = Boolean(activeKeyword || analysis);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Competitor Intelligence"
        description="Marketplace competitors, Google Trends, Meta ads, and AI analysis — run live with credits for fresh data."
      />

      <AiFeatureGate disabled={aiDisabled} feature="Competitor analysis" />

      {analyzeMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{analyzeMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection
        title="Analyze a competitor"
        description="Paste a product or store URL (Amazon, eBay, Shopify) or enter a keyword. Live mode refreshes marketplace, trend, and ad data (3 credits)."
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="comp-url">Store or product URL</FieldLabel>
            <Input
              id="comp-url"
              placeholder="https://www.amazon.com/dp/... or search URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-elegant"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="comp-region">Region</FieldLabel>
            <Select value={region} onValueChange={(v) => setRegion(v as RegionCode)}>
              <SelectTrigger id="comp-region" className="input-elegant h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {urlPreview?.query && !keyword.trim() ? (
          <p className="text-xs text-muted-foreground">
            Will search for: <strong className="text-foreground">{urlPreview.query}</strong>
            {urlPreview.platform ? ` · ${urlPreview.platform}` : ""}
          </p>
        ) : null}
        <FieldLabel htmlFor="comp-keyword">Keyword focus (optional if URL provided)</FieldLabel>
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

      {showResults ? (
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="intel">AI intel</TabsTrigger>
            {intelKeyword ? (
              <>
                <TabsTrigger value="competitors">
                  <Store className="w-4 h-4 mr-1" />
                  Competitors
                </TabsTrigger>
                <TabsTrigger value="trends">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Trend Pulse
                </TabsTrigger>
                <TabsTrigger value="ads">
                  <Megaphone className="w-4 h-4 mr-1" />
                  Ad Radar
                </TabsTrigger>
              </>
            ) : null}
          </TabsList>

          {intelKeyword ? (
            <>
              <TabsContent value="competitors" className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Marketplace listings for{" "}
                    <strong className="text-foreground">{activeKeyword || intelKeyword}</strong>
                  </p>
                  {analyzeMutation.data?.searchDataMode ? (
                    <DataFreshnessBadge
                      dataMode={analyzeMutation.data.searchDataMode}
                      creditsUsed={analyzeMutation.data.creditsUsed}
                    />
                  ) : null}
                </div>
                {competitorProducts.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {competitorProducts.map((product) => (
                      <ProductCard
                        key={`${product.platform}-${product.id}`}
                        product={product}
                        showTrendBadge={false}
                        showDataFreshness={false}
                        showSourceMeta={false}
                      />
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No marketplace listings found yet. Enable live mode and run analysis again, or
                      try a shorter keyword.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="trends" className="mt-6">
                <div className="card-elevated p-5 sm:p-6 space-y-3">
                  {intelKeyword !== activeKeyword && activeKeyword ? (
                    <p className="text-xs text-muted-foreground">
                      Trends use search term: <strong className="text-foreground">{intelKeyword}</strong>
                    </p>
                  ) : null}
                  <TrendPulsePanel
                    keyword={intelKeyword}
                    region={region}
                    seedSignal={trendSeed}
                  />
                </div>
              </TabsContent>

              <TabsContent value="ads" className="mt-6">
                <div className="card-elevated p-5 sm:p-6 space-y-3">
                  {intelKeyword !== activeKeyword && activeKeyword ? (
                    <p className="text-xs text-muted-foreground">
                      Ads use search term: <strong className="text-foreground">{intelKeyword}</strong>
                    </p>
                  ) : null}
                  <AdRadarPanel keyword={intelKeyword} region={region} seedSnapshot={adSeed} />
                </div>
              </TabsContent>
            </>
          ) : null}

          <TabsContent value="intel" className="mt-6 space-y-4">
            {analysis ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DataFreshnessBadge
                    dataMode={live ? "live" : "cached"}
                    creditsUsed={analyzeMutation.data?.creditsUsed}
                    synthetic
                  />
                  {intelKeyword ? (
                    <Badge variant="outline" className="text-[10px]">
                      Intel keyword: {intelKeyword}
                    </Badge>
                  ) : null}
                </div>

                {trendSeed || adSeed ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {trendSeed ? (
                      <InsightCard title="Search demand" icon={LineChart}>
                        <p className="text-sm capitalize">
                          {trendSeed.momentumLabel} · score {Math.round(trendSeed.momentumScore)}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="link"
                          className="px-0 h-auto text-xs"
                          onClick={() => setMainTab("trends")}
                        >
                          Open Trend Pulse →
                        </Button>
                      </InsightCard>
                    ) : null}
                    {adSeed ? (
                      <InsightCard title="Meta ad pressure" icon={Megaphone}>
                        <p className="text-sm">
                          {adSeed.activeAdCount} active ads · {adSeed.advertiserCount} advertisers
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="link"
                          className="px-0 h-auto text-xs"
                          onClick={() => setMainTab("ads")}
                        >
                          Open Ad Radar →
                        </Button>
                      </InsightCard>
                    ) : null}
                  </div>
                ) : null}

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

                {!trendSeed && !adSeed ? (
                  <Alert>
                    <AlertDescription>
                      No trend or ad cache yet for this keyword. Enable live mode and run analysis
                      again, or use Trend Pulse / Ad Radar tabs to refresh individually.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run analysis above to generate AI intel and marketplace competitor matches.
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
