import { Badge } from "@/components/ui/badge";
import { getDashboardPath } from "@/config/dashboardNav";
import { trpc } from "@/lib/trpc";
import { BookmarkIcon, Layers } from "lucide-react";
import { useLocation } from "wouter";

type WorkspaceQuickStatsProps = {
  enabled?: boolean;
};

export function WorkspaceQuickStats({ enabled = true }: WorkspaceQuickStatsProps) {
  const [, setLocation] = useLocation();
  const watchlist = trpc.watchlist.getWatchlist.useQuery(undefined, { enabled });
  const pipeline = trpc.pipeline.getPipelineItems.useQuery(undefined, { enabled });

  const watchCount = watchlist.data?.length ?? 0;
  const pipeCount = pipeline.data?.length ?? 0;
  const activeCount =
    pipeline.data?.filter((p) => p.stage === "testing" || p.stage === "scaling").length ?? 0;

  return (
    <div className="hidden lg:flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLocation(getDashboardPath("watchlist"))}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <BookmarkIcon className="h-3.5 w-3.5" />
        <span className="tabular-nums font-medium text-foreground">{watchCount}</span>
        saved
      </button>
      <button
        type="button"
        onClick={() => setLocation(getDashboardPath("pipeline"))}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <Layers className="h-3.5 w-3.5" />
        <span className="tabular-nums font-medium text-foreground">{activeCount}</span>
        active
        {pipeCount > activeCount ? (
          <Badge variant="outline" className="h-4 px-1 text-[10px] ml-0.5">
            {pipeCount}
          </Badge>
        ) : null}
      </button>
    </div>
  );
}
