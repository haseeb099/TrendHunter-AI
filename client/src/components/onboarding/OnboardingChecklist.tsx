import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOnboarding } from "@/_core/hooks/useOnboarding";
import { getDashboardPath } from "@/config/dashboardNav";
import {
  CheckCircle2,
  Circle,
  Compass,
  BookmarkIcon,
  Layers,
  DollarSign,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "wouter";

const STEPS = [
  {
    id: "discover" as const,
    label: "Search Discover",
    hint: "Explore trending products in your region",
    icon: Compass,
    href: getDashboardPath("search"),
  },
  {
    id: "watchlist" as const,
    label: "Save to Watchlist",
    hint: "Track a product you want to monitor",
    icon: BookmarkIcon,
    href: getDashboardPath("watchlist"),
  },
  {
    id: "pipeline" as const,
    label: "Add to Pipeline",
    hint: "Move a winner into testing",
    icon: Layers,
    href: getDashboardPath("pipeline"),
  },
  {
    id: "profit" as const,
    label: "Model profit",
    hint: "Run margin math on a product",
    icon: DollarSign,
    href: getDashboardPath("profit"),
  },
  {
    id: "social" as const,
    label: "Open Social Kit",
    hint: "Generate ad copy and hashtags",
    icon: Sparkles,
    href: getDashboardPath("social"),
  },
];

export function OnboardingChecklist() {
  const { state, dismiss, showChecklist } = useOnboarding();

  if (!showChecklist) return null;

  const completedCount = STEPS.filter((s) => state[s.id]).length;

  return (
    <Card className="surface-elevated p-4 sm:p-5 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold">Getting started</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount}/{STEPS.length} steps — search → watchlist → pipeline → profit → social
            kit
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss checklist"
          onClick={dismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <ul className="space-y-2">
        {STEPS.map((step) => {
          const done = state[step.id];
          const Icon = step.icon;
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  done
                    ? "border-success/30 bg-success/5 text-foreground"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
                ) : (
                  <Circle className="w-4 h-4 shrink-0 text-muted-foreground" />
                )}
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 text-left">
                  <p className="font-medium leading-none">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.hint}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
