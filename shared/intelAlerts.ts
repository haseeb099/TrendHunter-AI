import type { PlanId } from "./plans";
import { isUnlimited } from "./plans";

export const KEYWORD_WATCH_LIMITS: Record<PlanId, number> = {
  trial: 10,
  starter: 5,
  pro: 25,
  business: 75,
  agency: -1,
};

export function keywordWatchLimit(planId: PlanId): number {
  return KEYWORD_WATCH_LIMITS[planId] ?? 5;
}

export function canAddKeywordWatch(planId: PlanId, currentCount: number): boolean {
  const limit = keywordWatchLimit(planId);
  if (isUnlimited(limit)) return true;
  return currentCount < limit;
}
