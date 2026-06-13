import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  ListChecks,
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
  const progress = Math.round((completedCount / STEPS.length) * 100);
  const nextStep = STEPS.find((s) => !state[s.id]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-xs hover:bg-primary/10 transition-colors max-w-[11rem] sm:max-w-none"
          aria-label={`Getting started, ${completedCount} of ${STEPS.length} steps complete`}
        >
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="hidden sm:inline font-medium text-foreground">Setup</span>
          <span className="tabular-nums font-semibold text-foreground">
            {completedCount}/{STEPS.length}
          </span>
          <Progress value={progress} className="hidden sm:block h-1 w-14 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-start justify-between gap-2 border-b px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Getting started</p>
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount}/{STEPS.length} complete
              {nextStep ? (
                <>
                  {" "}
                  · Next: <span className="text-foreground">{nextStep.label}</span>
                </>
              ) : null}
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

        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 border-b bg-muted/20">
          {STEPS.map((step) => {
            const done = state[step.id];
            const Icon = step.icon;
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={step.href}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                      done
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                    aria-label={step.label}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{step.label}</p>
                  <p className="text-background/70">{step.hint}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <ul className="max-h-64 overflow-y-auto p-2">
          {STEPS.map((step) => {
            const done = state[step.id];
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors ${
                    done
                      ? "text-muted-foreground"
                      : "hover:bg-muted/40 text-foreground"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className={`truncate ${done ? "line-through" : "font-medium"}`}>
                    {step.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
