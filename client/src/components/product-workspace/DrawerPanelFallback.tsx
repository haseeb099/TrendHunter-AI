import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type DrawerPanelFallbackProps = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  loading?: boolean;
  loadingLabel?: string;
  action?: ReactNode;
  className?: string;
};

export function DrawerPanelFallback({
  icon: Icon,
  title,
  description,
  loading = false,
  loadingLabel = "Loading…",
  action,
  className,
}: DrawerPanelFallbackProps) {
  if (loading) {
    return (
      <div className={cn("product-panel-empty", className)}>
        <Spinner className="w-8 h-8 mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">{loadingLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn("product-panel-empty", className)}>
      {Icon ? (
        <div className="product-panel-empty-icon">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      ) : null}
      {title ? <h4 className="font-display font-semibold text-base">{title}</h4> : null}
      {description ? (
        <p className="text-sm text-muted-foreground text-balance max-w-xs mx-auto">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
