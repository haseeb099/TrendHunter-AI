import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TrendScoreInputs } from "@shared/searchTypes";
import { Info } from "lucide-react";

type TrendScoreExplainProps = {
  score: number;
  inputs?: TrendScoreInputs;
  compact?: boolean;
  className?: string;
};

function formatBoost(value: number, label: string) {
  if (value === 0) return null;
  return `${label} ${value > 0 ? "+" : ""}${value}`;
}

export function TrendScoreExplain({
  score,
  inputs,
  compact = false,
  className,
}: TrendScoreExplainProps) {
  if (!inputs) {
    return (
      <span className={`text-[13px] font-medium tabular-nums ${className ?? ""}`}>{score}</span>
    );
  }

  const lines = [
    `Base ${inputs.baseScore}`,
    formatBoost(inputs.ratingBoost, "Rating"),
    formatBoost(inputs.shippingBoost, "Fast ship"),
    formatBoost(inputs.priceBoost, "Price band"),
    formatBoost(inputs.trendingFlag, "Trending"),
    inputs.momentumScore != null ? `Momentum ${Math.round(inputs.momentumScore)}` : null,
    inputs.adSaturationScore != null
      ? `Ad saturation ${Math.round(inputs.adSaturationScore)}`
      : null,
    inputs.marginHint != null ? `Margin hint ${Math.round(inputs.marginHint)}` : null,
    inputs.supplierConfidence != null
      ? `Supplier ${Math.round(inputs.supplierConfidence)}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 text-left ${className ?? ""}`}
          aria-label={`Trend score ${score}. Show breakdown.`}
        >
          <span className={`font-medium tabular-nums ${compact ? "text-[13px]" : "text-sm"}`}>
            {score}
          </span>
          <Info className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="text-xs font-semibold mb-2">Why score {score}?</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {inputs.momentumScore != null ? (
          <Badge variant="outline" className="mt-2 text-[10px]">
            Signal fusion applied
          </Badge>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
