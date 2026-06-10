import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type DataFreshnessBadgeProps = {
  dataMode?: "cached" | "live" | "demo";
  cachedAt?: string | null;
  stale?: boolean;
  creditsUsed?: number;
};

export function DataFreshnessBadge({
  dataMode = "cached",
  cachedAt,
  stale,
  creditsUsed,
}: DataFreshnessBadgeProps) {
  if (dataMode === "demo") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        Demo data
      </Badge>
    );
  }

  const label =
    dataMode === "live"
      ? "Live"
      : stale
        ? "Stale cache"
        : "Cached";

  const Icon = dataMode === "live" ? Zap : Database;
  const timeAgo =
    cachedAt && !Number.isNaN(Date.parse(cachedAt))
      ? formatDistanceToNow(new Date(cachedAt), { addSuffix: true })
      : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={dataMode === "live" ? "default" : "secondary"} className="text-[10px] gap-1">
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
