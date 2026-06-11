import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Database, AlertTriangle, Sparkles, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  resolveDataState,
  type DataMode,
  type DataState,
} from "@shared/searchTypes";

type DataFreshnessBadgeProps = {
  state?: DataState;
  dataMode?: DataMode;
  cachedAt?: string | null;
  stale?: boolean;
  synthetic?: boolean;
  unavailable?: boolean;
  creditsUsed?: number;
  className?: string;
};

const STATE_META: Record<
  DataState,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; Icon: typeof Zap }
> = {
  live: { label: "Live", variant: "default", Icon: Zap },
  cached: { label: "Cached", variant: "secondary", Icon: Database },
  stale: { label: "Stale cache", variant: "outline", Icon: AlertTriangle },
  synthetic: { label: "AI-generated", variant: "outline", Icon: Sparkles },
  unavailable: { label: "Unavailable", variant: "destructive", Icon: Ban },
};

export function DataFreshnessBadge({
  state: stateProp,
  dataMode = "cached",
  cachedAt,
  stale,
  synthetic,
  unavailable,
  creditsUsed,
  className,
}: DataFreshnessBadgeProps) {
  const state =
    stateProp ??
    resolveDataState({ dataMode, stale, synthetic, unavailable });

  const { label, variant, Icon } = STATE_META[state];
  const timeAgo =
    cachedAt && !Number.isNaN(Date.parse(cachedAt))
      ? formatDistanceToNow(new Date(cachedAt), { addSuffix: true })
      : null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      <Badge variant={variant} className="text-[10px] gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
      {timeAgo ? (
        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
      ) : null}
      {creditsUsed != null && creditsUsed > 0 ? (
        <Badge variant="outline" className="text-[10px]">
          −{creditsUsed} credit{creditsUsed !== 1 ? "s" : ""}
        </Badge>
      ) : null}
    </div>
  );
}
