import { Badge } from "@/components/ui/badge";
import type { ProductIntelligenceSummary } from "@shared/searchTypes";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { DataFreshnessBadge } from "./DataFreshnessBadge";

type IntelligenceVerdictProps = {
  summary: ProductIntelligenceSummary | null | undefined;
  stale?: boolean;
};

type Verdict = {
  label: string;
  tone: "success" | "warning" | "muted";
  summary: string;
  icon: typeof CheckCircle2;
};

function computeVerdict(summary: ProductIntelligenceSummary | null | undefined): Verdict {
  if (
    !summary?.trendLabel &&
    summary?.activeAdCount == null &&
    summary?.tiktokActiveAdCount == null
  ) {
    return {
      label: "No data yet",
      tone: "muted",
      summary: "Search a keyword to load Google Trends, Meta ads, and TikTok intel.",
      icon: HelpCircle,
    };
  }

  const rising = summary.trendLabel === "rising";
  const declining = summary.trendLabel === "declining";
  const ads = summary.activeAdCount ?? 0;
  const tiktok = summary.tiktokActiveAdCount ?? 0;
  const score = summary.trendMomentum ?? 50;

  if (rising && ads < 12 && tiktok < 20) {
    return {
      label: "Strong opportunity",
      tone: "success",
      summary:
        "Demand is climbing and few competitors are running Meta ads. Good time to test creatives and listings.",
      icon: CheckCircle2,
    };
  }
  if (rising && ads >= 12) {
    return {
      label: "Hot but competitive",
      tone: "warning",
      summary:
        "High search interest, but many advertisers are already active. Differentiate with hooks, offers, or angles.",
      icon: AlertTriangle,
    };
  }
  if (declining) {
    return {
      label: "Cooling demand",
      tone: "warning",
      summary:
        "Google Trends shows declining interest. Consider adjacent keywords or wait for a seasonal uptick.",
      icon: AlertTriangle,
    };
  }
  if (score >= 60 && ads < 20) {
    return {
      label: "Worth testing",
      tone: "success",
      summary: "Stable-to-positive demand with manageable ad competition. Validate margins before scaling.",
      icon: CheckCircle2,
    };
  }

  return {
    label: "Research more",
    tone: "muted",
    summary:
      "Mixed signals — compare related rising queries and competitor creatives before committing budget.",
    icon: HelpCircle,
  };
}

export function IntelligenceVerdict({ summary, stale }: IntelligenceVerdictProps) {
  const verdict = computeVerdict(summary);
  const Icon = verdict.icon;
  const hasData = Boolean(summary?.fetchedAt);

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        verdict.tone === "success"
          ? "border-success/30 bg-success/5"
          : verdict.tone === "warning"
            ? "border-warning/30 bg-warning/5"
            : "border-border bg-muted/20"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            className={`w-4 h-4 ${
              verdict.tone === "success"
                ? "text-success"
                : verdict.tone === "warning"
                  ? "text-warning"
                  : "text-muted-foreground"
            }`}
          />
          <Badge
            variant={verdict.tone === "success" ? "default" : "secondary"}
            className="text-[11px]"
          >
            {verdict.label}
          </Badge>
        </div>
        {hasData ? (
          <DataFreshnessBadge
            dataMode="cached"
            cachedAt={summary?.fetchedAt}
            stale={stale}
          />
        ) : (
          <DataFreshnessBadge unavailable />
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{verdict.summary}</p>
      {!hasData ? (
        <p className="text-[11px] text-muted-foreground">
          Verdict uses cached Google Trends and Meta Ad Library snapshots — not live marketplace prices.
        </p>
      ) : null}
    </div>
  );
}
