import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, TrendingDown, BarChart3, DollarSign, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

export default function CompetitorSpy() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");

  const analyzeMutation = trpc.competitor.analyzeCompetitor.useMutation();

  const handleAnalyze = async () => {
    if (!url.trim() && !keyword.trim()) return;
    await analyzeMutation.mutateAsync({ url, keyword });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Competitor Spy</h1>
        <p className="text-muted-foreground">Analyze competitor listings, pricing, and strategies</p>
      </div>

      <Card className="card-elevated p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Competitor Store URL</label>
            <Input
              placeholder="https://example-store.com or competitor keyword..."
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
          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="btn-primary"
          >
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

      {analyzeMutation.data && (
        <div className="space-y-4 animate-in">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Pricing Strategy</h3>
              </div>
              <p className="text-muted-foreground text-sm">{typeof analyzeMutation.data.analysis === 'string' ? analyzeMutation.data.analysis : 'Analysis complete'}</p>
            </Card>
            <Card className="card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Market Position</h3>
              </div>
              <p className="text-muted-foreground text-sm">Competitive analysis in progress</p>
            </Card>
          </div>
        </div>
      )}

      {!analyzeMutation.data && (
        <Card className="card-elevated p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Enter a competitor URL or keyword to begin analysis</p>
        </Card>
      )}
    </div>
  );
}
