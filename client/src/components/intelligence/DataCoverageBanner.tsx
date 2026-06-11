import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Database, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

type DataCoverageBannerProps = {
  compact?: boolean;
  /** Optional page identifier for future analytics (ignored today). */
  pageId?: string;
};

export function DataCoverageBanner({ compact = false }: DataCoverageBannerProps) {
  const configQuery = trpc.system.getConfig.useQuery();
  const ingestQuery = trpc.intelligence.getIngestStatus.useQuery();

  const dp = configQuery.data?.dataPlatform;
  const lastRun = ingestQuery.data?.lastRun;
  const lastIngestAt = lastRun?.completedAt ?? lastRun?.startedAt ?? null;
  const ttlHours = ingestQuery.data?.cacheTtlHours ?? 24;

  const providers = [
    { label: "Google Trends", ok: dp?.serpConfigured ?? dp?.serpApiConfigured },
    { label: "Meta Ads", ok: dp?.metaAdsConfigured },
    { label: "TikTok Ads", ok: dp?.tiktokAdsConfigured },
    { label: "Cache-first ingest", ok: dp?.cacheFirst },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <Database className="w-3 h-3" />
        <span>Cache-first intel · TTL {ttlHours}h</span>
        {lastIngestAt ? (
          <span>
            · Ingest{" "}
            {formatDistanceToNow(new Date(lastIngestAt), { addSuffix: true })}
          </span>
        ) : null}
        <span className="text-muted-foreground">· See DATA-TRUTH-CONTRACT.md</span>
      </div>
    );
  }

  return (
    <Alert className="border-border bg-muted/20">
      <Info className="w-4 h-4" />
      <AlertDescription className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-foreground font-medium">Data coverage & freshness</p>
          {lastIngestAt ? (
            <DataFreshnessBadge dataMode="cached" cachedAt={lastIngestAt} />
          ) : (
            <Badge variant="outline" className="text-[10px]">
              No ingest run yet
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Intel pages read cached snapshots by default. Live refresh costs credits. Stale badges mean
          expired cache served because live APIs were not called.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <Badge
              key={p.label}
              variant={p.ok ? "secondary" : "outline"}
              className="text-[10px]"
            >
              {p.label}: {p.ok ? "configured" : "not set"}
            </Badge>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Full contract: <code className="text-[10px]">docs/DATA-TRUTH-CONTRACT.md</code> — defines
          live, cached, stale, synthetic, and unavailable states.
        </p>
      </AlertDescription>
    </Alert>
  );
}
