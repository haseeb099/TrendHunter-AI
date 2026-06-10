import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AdminMetricCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
};

const toneStyles = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: AdminMetricCardProps) {
  return (
    <div className={cn("admin-metric-card", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="admin-metric-label">{label}</p>
          <p className={cn("admin-metric-value tabular-nums", toneStyles[tone])}>{value}</p>
          {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="admin-metric-icon">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
