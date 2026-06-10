import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("admin-empty-state", className)}>
      {Icon ? (
        <div className="admin-empty-icon">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      ) : null}
      <p className="font-medium text-sm">{title}</p>
      {description ? <p className="text-sm text-muted-foreground max-w-sm">{description}</p> : null}
      {action}
    </div>
  );
}
