import type { PlanId } from "./plans";
import { isUnlimited } from "./plans";

/** Max saved kits per plan (starter = 0 — no social feature) */
export const SAVED_SOCIAL_KIT_LIMITS: Record<PlanId, number> = {
  trial: 15,
  starter: 0,
  pro: 30,
  business: 100,
  agency: -1,
};

export function savedSocialKitLimit(planId: PlanId): number {
  return SAVED_SOCIAL_KIT_LIMITS[planId] ?? 0;
}

export function canSaveMoreKits(planId: PlanId, currentCount: number): boolean {
  const limit = savedSocialKitLimit(planId);
  if (limit < 0) return true;
  return currentCount < limit;
}

export function formatSavedKitLimit(planId: PlanId): string {
  const limit = savedSocialKitLimit(planId);
  return isUnlimited(limit) ? "Unlimited" : String(limit);
}
