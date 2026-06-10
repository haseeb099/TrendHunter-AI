import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type InsightCardProps = {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
};

export function InsightCard({ title, icon: Icon, children, className, badge }: InsightCardProps) {
  return (
    <article className={cn("card-elevated p-5 sm:p-6 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-display text-sm font-semibold">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </article>
  );
}
