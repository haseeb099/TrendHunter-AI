import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({
  eyebrow = "Super Admin",
  title,
  description,
  icon: Icon,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        <p className="admin-eyebrow">{eyebrow}</p>
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="admin-icon-ring shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-balance">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
