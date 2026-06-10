import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ALWAYS_ACCESSIBLE_TABS,
  minimumPlanForFeature,
  PLAN_DEFINITIONS,
  TAB_REQUIRED_FEATURE,
  type DashboardTabId,
  type FeatureId,
  type PlanId,
  isUnlimited,
} from "@shared/plans";
import { useMemo } from "react";

export function usePlan() {
  const { user, loading } = useAuth();
  const subscription = user?.subscription ?? null;
  const plansQuery = trpc.billing.getPlans.useQuery();

  return useMemo(() => {
    const canAccess = (feature: FeatureId): boolean => {
      if (!subscription) return false;
      if (user?.role === "admin") return true;
      return subscription.features.includes(feature);
    };

    const isPaused =
      user?.accountStatus === "paused" ||
      (user?.pausedUntil ? new Date(user.pausedUntil) > new Date() : false);

    const isFlagged = user?.accountStatus === "flagged";
    const isDeactivated = user?.accountStatus === "deactivated";

    const isRestricted = (isPaused || isFlagged || isDeactivated) && user?.role !== "admin";

    const canAccessTab = (tab: DashboardTabId): boolean => {
      if (ALWAYS_ACCESSIBLE_TABS.includes(tab)) return true;
      if (isRestricted) return false;
      const feature = TAB_REQUIRED_FEATURE[tab as keyof typeof TAB_REQUIRED_FEATURE];
      if (!feature) return true;
      return canAccess(feature);
    };

    const requiredPlanFor = (feature: FeatureId): PlanId => {
      const catalogPlans = plansQuery.data?.plans;
      if (catalogPlans?.length) {
        const order: PlanId[] = ["starter", "pro", "business", "agency"];
        for (const planId of order) {
          const plan = catalogPlans.find((p) => p.id === planId);
          if (plan?.featureIds?.includes(feature)) return planId;
        }
      }
      return minimumPlanForFeature(feature);
    };

    const planDisplayName = (planId: PlanId): string => {
      const fromCatalog = plansQuery.data?.plans?.find((p) => p.id === planId);
      return fromCatalog?.name ?? PLAN_DEFINITIONS[planId]?.name ?? planId;
    };

    const searchLimit = subscription?.limits.searchesPerMonth ?? 0;
    const searchesUsed = subscription?.usage.searchesThisMonth ?? 0;
    const searchesRemaining = isUnlimited(searchLimit)
      ? null
      : Math.max(0, searchLimit - searchesUsed);

    return {
      subscription,
      loading: loading || plansQuery.isLoading,
      planId: subscription?.planId ?? null,
      effectivePlanId: subscription?.effectivePlanId ?? null,
      displayName: subscription?.displayName ?? "Starter",
      isTrial: subscription?.isTrial ?? false,
      isActive: subscription?.isActive ?? false,
      daysLeftInTrial: subscription?.daysLeftInTrial ?? null,
      canStartTrial: subscription?.canStartTrial ?? false,
      canAccess,
      canAccessTab,
      requiredPlanFor,
      planDisplayName,
      searchesRemaining,
      searchesUsed,
      searchLimit,
      isPaused: isPaused && user?.role !== "admin",
      isFlagged: isFlagged && user?.role !== "admin",
      isDeactivated: isDeactivated && user?.role !== "admin",
      isRestricted,
      flagReason: user?.flagReason ?? null,
      role: user?.role ?? "user",
      accountStatus: user?.accountStatus ?? "active",
      selfServeBilling: plansQuery.data?.selfServeBilling ?? false,
      stripeConfigured: plansQuery.data?.stripeConfigured ?? false,
    };
  }, [
    subscription,
    loading,
    plansQuery.data,
    plansQuery.isLoading,
    user?.role,
    user?.accountStatus,
    user?.pausedUntil,
    user?.flagReason,
  ]);
}
