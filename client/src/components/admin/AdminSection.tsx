import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type AdminSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
};

export function AdminSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  flush = false,
}: AdminSectionProps) {
  return (
    <section className={cn("admin-section", className)}>
      <div className="admin-section-header">
        <div className="min-w-0">
          <p className="font-medium text-sm flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4 text-primary shrink-0" /> : null}
            {title}
          </p>
          {description ? (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn(!flush && "p-5 sm:p-6")}>{children}</div>
    </section>
  );
}
