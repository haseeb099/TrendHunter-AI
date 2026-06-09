import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SearchProviderStatus } from "@shared/searchTypes";
import { CheckCircle2, Circle, Clock, Gift, Sparkles } from "lucide-react";

type ProviderStatusBarProps = {
  providers: SearchProviderStatus[] | undefined;
  isLoading?: boolean;
};

function tierIcon(tier: SearchProviderStatus["tier"]) {
  if (tier === "free") return Gift;
  if (tier === "demo") return Sparkles;
  return Circle;
}

function statusLabel(provider: SearchProviderStatus) {
  if (provider.configured && provider.tier === "free") return "Free · active";
  if (provider.configured && provider.tier === "paid") return "Live";
  if (provider.configured && provider.tier === "demo") return "Fallback";
  if (provider.tier === "paid") return "Not configured";
  return "Off";
}

export function ProviderStatusBar({ providers, isLoading }: ProviderStatusBarProps) {
  if (isLoading || !providers?.length) return null;

  const active = providers.filter((p) => p.configured && p.id !== "mock");
  const freeCount = active.filter((p) => p.tier === "free").length;
  const paidCount = active.filter((p) => p.tier === "paid").length;
  const pendingPaid = providers.filter((p) => p.tier === "paid" && !p.configured);

  return (
    <Card className="surface-elevated p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Data sources
          </p>
          <p className="text-sm text-muted-foreground">
            {freeCount > 0 ? (
              <span className="text-success font-medium">{freeCount} free</span>
            ) : null}
            {freeCount > 0 && paidCount > 0 ? " · " : null}
            {paidCount > 0 ? (
              <span className="text-primary font-medium">{paidCount} paid/live</span>
            ) : null}
            {active.length === 0 ? "Demo mode — add keys when ready" : null}
          </p>
        </div>
        {pendingPaid.length > 0 ? (
          <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">
            <Clock className="w-3 h-3 mr-1" />
            {pendingPaid.length} awaiting keys
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {providers
          .filter((p) => p.id !== "mock")
          .map((provider) => {
            const Icon = tierIcon(provider.tier);
            const active = provider.configured;
            return (
              <div
                key={provider.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? provider.tier === "free"
                      ? "border-success/25 bg-success/5"
                      : "border-primary/25 bg-primary/5"
                    : "border-border bg-muted/20"
                }`}
              >
                {active ? (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      provider.tier === "free" ? "text-success" : "text-primary"
                    }`}
                  />
                ) : (
                  <Icon className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/50" />
                )}
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{provider.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {statusLabel(provider)}
                    {provider.note ? ` — ${provider.note}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );
}
