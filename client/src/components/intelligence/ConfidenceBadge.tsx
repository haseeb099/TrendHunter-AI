import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import type { RankingExplanation } from "@shared/searchTypes";

type Confidence = NonNullable<RankingExplanation["confidence"]>;

const CONFIG: Record<
  Confidence,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  high: {
    label: "High confidence",
    className: "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    Icon: CheckCircle2,
  },
  medium: {
    label: "Medium confidence",
    className: "text-sky-700 border-sky-300 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800",
    Icon: HelpCircle,
  },
  low: {
    label: "Low confidence",
    className: "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    Icon: AlertTriangle,
  },
};

type Props = {
  confidence?: Confidence;
  compact?: boolean;
};

export function ConfidenceBadge({ confidence, compact = false }: Props) {
  if (!confidence) return null;
  const { label, className, Icon } = CONFIG[confidence];
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${className}`}>
      <Icon className="w-3 h-3" />
      {compact ? confidence : label}
    </Badge>
  );
}
