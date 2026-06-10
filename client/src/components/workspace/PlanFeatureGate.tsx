import { Button } from "@/components/ui/button";
import { usePlan } from "@/_core/hooks/usePlan";
import { getDashboardPath } from "@/config/dashboardNav";
import { type FeatureId } from "@shared/plans";
import { Lock, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

type PlanFeatureGateProps = {
  feature: FeatureId;
  title?: string;
  description?: string;
};

export function PlanFeatureGate({ feature, title, description }: PlanFeatureGateProps) {
  const { canAccess, requiredPlanFor, planDisplayName, isTrial, daysLeftInTrial } = usePlan();
  const [, setLocation] = useLocation();

  if (canAccess(feature)) return null;

  const requiredPlanName = planDisplayName(requiredPlanFor(feature));

  return (
    <div className="card-elevated p-6 sm:p-8 text-center space-y-4 border-dashed">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
        <Lock className="h-5 w-5" />
      </div>
      <div className="space-y-2 max-w-md mx-auto">
        <h3 className="font-display text-base font-semibold">
          {title ?? `${requiredPlanName} plan required`}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description ??
            `This feature is included on ${requiredPlanName} and above. Upgrade to unlock it.`}
        </p>
        {isTrial && daysLeftInTrial !== null ? (
          <p className="text-xs text-warning flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Trial ends in {daysLeftInTrial} day{daysLeftInTrial === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
      <Button onClick={() => setLocation(getDashboardPath("billing"))}>
        View plans & upgrade
      </Button>
    </div>
  );
}
