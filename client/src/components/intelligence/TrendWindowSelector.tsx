import { cn } from "@/lib/utils";
import type { TrendWindow } from "@shared/intelligenceTypes";
import { TREND_WINDOW_LABELS } from "@/_core/hooks/useTrendWindow";

const OPTIONS: TrendWindow[] = ["7d", "30d", "90d"];

type TrendWindowSelectorProps = {
  value: TrendWindow;
  onChange: (window: TrendWindow) => void;
  className?: string;
};

export function TrendWindowSelector({ value, onChange, className }: TrendWindowSelectorProps) {
  return (
    <div
      className={cn(
        "flex rounded-lg border border-border bg-muted/30 p-0.5",
        className?.includes("w-full") ? "w-full" : "inline-flex",
        className
      )}
      role="group"
      aria-label="Trend window"
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-center text-[11px] font-medium transition-colors",
            value === option
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {TREND_WINDOW_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
