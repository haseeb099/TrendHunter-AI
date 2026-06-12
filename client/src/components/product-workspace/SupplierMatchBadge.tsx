import type { SupplierMatchState } from "@shared/searchTypes";
import { cn } from "@/lib/utils";

const MATCH_BADGE_CLASS: Record<SupplierMatchState, string> = {
  exact: "bg-success/10 text-success border-success/30",
  similar: "bg-warning/10 text-warning border-warning/30",
  none: "bg-muted text-muted-foreground border-border",
};

const MATCH_LABEL: Record<SupplierMatchState, string> = {
  exact: "Exact match",
  similar: "Similar match",
  none: "No match",
};

type SupplierMatchBadgeProps = {
  matchState: SupplierMatchState;
  message?: string;
  compact?: boolean;
  className?: string;
};

export function SupplierMatchBadge({
  matchState,
  message,
  compact = false,
  className,
}: SupplierMatchBadgeProps) {
  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize",
          MATCH_BADGE_CLASS[matchState],
          className
        )}
      >
        {MATCH_LABEL[matchState]}
      </span>
    );
  }

  return (
    <div className={cn(`rounded-lg border px-3 py-2.5 text-sm ${MATCH_BADGE_CLASS[matchState]}`, className)}>
      <p className="font-medium">{MATCH_LABEL[matchState]}</p>
      {message ? <p className="text-xs mt-1 opacity-90">{message}</p> : null}
    </div>
  );
}
