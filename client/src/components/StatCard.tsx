import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  valueClassName?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <div className={cn("surface p-5 sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="metric-label">{label}</p>
          <p className={cn("stat-value text-2xl sm:text-3xl", valueClassName)}>{value}</p>
          {trend ? (
            <p className="text-xs text-muted-foreground">{trend}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
