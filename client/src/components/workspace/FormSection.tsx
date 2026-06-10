import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type FormSectionProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
};

export function FormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  footer,
}: FormSectionProps) {
  return (
    <section className={cn("card-elevated overflow-hidden", className)}>
      {title ? (
        <div className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6 bg-muted/15">
          {Icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="p-5 sm:p-6 space-y-4">{children}</div>
      {footer ? (
        <div className="border-t border-border px-5 py-4 sm:px-6 bg-muted/10">{footer}</div>
      ) : null}
    </section>
  );
}
