import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-semibold mb-1.5">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? (
        <Button onClick={action.onClick} className="mt-6" size="sm">
          {action.label}
        </Button>
      ) : null}
      {children}
    </div>
  );
}
