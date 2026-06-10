import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SidePanelRootProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function SidePanel({ open, onOpenChange, children }: SidePanelRootProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
    </Sheet>
  );
}

type SidePanelContentProps = {
  children: ReactNode;
  size?: "md" | "lg" | "xl";
  className?: string;
  onClose?: () => void;
  /** Hide default sheet close — use when header has its own */
  hideClose?: boolean;
};

const sizeClasses = {
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
};

export function SidePanelContent({
  children,
  size = "lg",
  className,
  onClose,
  hideClose = true,
}: SidePanelContentProps) {
  return (
    <SheetContent
      className={cn(
        "side-panel-content w-full p-0 gap-0 flex flex-col h-full border-l border-border/80",
        sizeClasses[size],
        hideClose && "[&>button:last-child]:hidden",
        className
      )}
    >
      {onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="side-panel-close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      {children}
    </SheetContent>
  );
}

type SidePanelHeaderProps = {
  title: string;
  subtitle?: string;
  avatarLabel?: string;
  badges?: ReactNode;
  meta?: ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
};

export function SidePanelHeader({
  title,
  subtitle,
  avatarLabel,
  badges,
  meta,
  icon: Icon,
  loading,
}: SidePanelHeaderProps) {
  const initials = (avatarLabel ?? title)
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="side-panel-header shrink-0">
      <div className="flex items-start gap-4 pr-10">
        {avatarLabel !== undefined ? (
          <Avatar className="h-12 w-12 border-2 border-primary/15 shrink-0 shadow-sm">
            <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold text-sm">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
        ) : Icon ? (
          <div className="side-panel-header-icon shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <SheetTitle className="font-display text-lg font-semibold leading-tight text-left truncate">
            {loading ? "Loading…" : title}
          </SheetTitle>
          {subtitle ? (
            <SheetDescription className="text-sm text-left truncate">{subtitle}</SheetDescription>
          ) : null}
          {meta ? <div className="text-xs text-muted-foreground pt-0.5">{meta}</div> : null}
        </div>
      </div>
      {badges ? <div className="flex flex-wrap gap-1.5 mt-4">{badges}</div> : null}
    </div>
  );
}

type SidePanelTabsProps<T extends string> = {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
};

export function SidePanelTabs<T extends string>({ tabs, active, onChange }: SidePanelTabsProps<T>) {
  return (
    <div className="side-panel-tabs shrink-0">
      <div className="flex gap-1 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "side-panel-tab flex-1",
              active === tab.id ? "side-panel-tab-active" : "side-panel-tab-inactive"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SidePanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("side-panel-body flex-1 overflow-y-auto", className)}>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  );
}

export function SidePanelFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("side-panel-footer shrink-0", className)}>
      {children}
    </div>
  );
}

export function SidePanelSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("side-panel-section", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SidePanelMetrics({
  items,
}: {
  items: { label: string; value: string; icon?: LucideIcon }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="side-panel-metric">
          {item.icon ? (
            <item.icon className="h-3.5 w-3.5 text-muted-foreground mb-1.5" />
          ) : null}
          <p className="side-panel-metric-label">{item.label}</p>
          <p className="side-panel-metric-value tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SidePanelActionGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function SidePanelLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 px-6">
      <Spinner className="w-7 h-7 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function SidePanelEmpty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="side-panel-empty">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function SidePanelTimeline({
  items,
}: {
  items: { id: string | number; title: string; subtitle?: string; time: string }[];
}) {
  if (items.length === 0) {
    return <SidePanelEmpty title="No activity yet" />;
  }
  return (
    <ul className="side-panel-timeline space-y-0">
      {items.map((item, i) => (
        <li key={item.id} className="side-panel-timeline-item">
          <div className="side-panel-timeline-dot" aria-hidden />
          {i < items.length - 1 ? <div className="side-panel-timeline-line" aria-hidden /> : null}
          <div className="min-w-0 pb-4">
            <p className="text-sm font-medium truncate">{item.title}</p>
            {item.subtitle ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
            ) : null}
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{item.time}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
