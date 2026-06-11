import type { User } from "../drizzle/schema";
import {
  PLAN_DEFINITIONS,
  type FeatureId,
  type PlanId,
  type PlanStatus,
  type SubscriptionInfo,
  formatPlanDisplayName,
  getPlanFromCatalog,
  isUnlimited,
  minimumPlanForFeature,
  planHasFeature,
} from "@shared/plans";
import { PLAN_LIVE_CREDITS, isUnlimitedCredits } from "@shared/credits";
import { getCreditWallet, countCreditsSpentThisMonth } from "./credits";
import { getPlanCatalog, getTrialDays } from "./planCatalog";
import type { LimitOverrides } from "@shared/adminTypes";
import {
  ACCOUNT_DEACTIVATED_ERR_MSG,
  ACCOUNT_FLAGGED_ERR_MSG,
  ACCOUNT_PAUSED_ERR_MSG,
  PLAN_FORBIDDEN_ERR_MSG,
  PLAN_LIMIT_ERR_MSG,
  SUBSCRIPTION_INACTIVE_ERR_MSG,
} from "@shared/const";
import { TRPCError } from "@trpc/server";
import {
  countUserEventsSince,
  countPipelineItems,
  countWatchlistItems,
  getDb,
  updateUserSubscription,
} from "./db";
import { users } from "../drizzle/schema";
import { and, eq, isNotNull, lt } from "drizzle-orm";

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

async function getEffectiveLimits(user: User, effectivePlanId: PlanId) {
  const catalog = await getPlanCatalog();
  const base = getPlanFromCatalog(effectivePlanId, catalog).limits;
  const overrides = (user.limitOverrides ?? null) as LimitOverrides | null;
  if (!overrides) return base;
  return {
    searchesPerMonth: overrides.searchesPerMonth ?? base.searchesPerMonth,
    aiCallsPerMonth: overrides.aiCallsPerMonth ?? base.aiCallsPerMonth,
    pipelineItems: overrides.pipelineItems ?? base.pipelineItems,
    watchlistItems: overrides.watchlistItems ?? base.watchlistItems,
    liveCreditsPerMonth:
      overrides.liveCreditsPerMonth ??
      base.liveCreditsPerMonth ??
      PLAN_LIVE_CREDITS[effectivePlanId],
  };
}

const trialExpiryInFlight = new Set<number>();

/** Persist trial expiry when DB still shows active but trial end date has passed. */
export async function lazyExpireTrialIfNeeded(user: User): Promise<void> {
  if (isAdmin(user)) return;
  if (user.planId !== "trial" || user.planStatus !== "active") return;
  if (!user.trialEndsAt || new Date(user.trialEndsAt) > new Date()) return;
  if (trialExpiryInFlight.has(user.id)) return;

  trialExpiryInFlight.add(user.id);
  try {
    await updateUserSubscription(user.id, { planStatus: "expired" });
    user.planStatus = "expired";
  } catch (err) {
    console.warn("[Plans] lazy trial expiry failed:", err);
  } finally {
    trialExpiryInFlight.delete(user.id);
  }
}

function scheduleLazyExpireTrial(user: User): void {
  if (trialExpiryInFlight.has(user.id)) return;
  void lazyExpireTrialIfNeeded(user);
}

export function assertSubscriptionActive(user: User): void {
  if (isAdmin(user)) return;

  scheduleLazyExpireTrial(user);
  const resolved = resolveEffectivePlan(user);
  if (!resolved.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: SUBSCRIPTION_INACTIVE_ERR_MSG,
    });
  }
}

export function assertAccountUsable(user: User): void {
  if (isAdmin(user)) return;

  if (user.accountStatus === "deactivated") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ACCOUNT_DEACTIVATED_ERR_MSG,
    });
  }

  const pausedByStatus = user.accountStatus === "paused";
  const pausedByDate =
    user.pausedUntil !== null && user.pausedUntil !== undefined
      ? new Date(user.pausedUntil) > new Date()
      : false;

  if (pausedByStatus || pausedByDate) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ACCOUNT_PAUSED_ERR_MSG,
    });
  }

  if (user.accountStatus === "flagged") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ACCOUNT_FLAGGED_ERR_MSG,
    });
  }
}

export function resolveEffectivePlan(user: User): {
  planId: PlanId;
  effectivePlanId: PlanId;
  planStatus: PlanStatus;
  isTrial: boolean;
  isActive: boolean;
  trialEndsAt: Date | null;
} {
  if (isAdmin(user)) {
    return {
      planId: user.planId as PlanId,
      effectivePlanId: "agency",
      planStatus: "active",
      isTrial: false,
      isActive: true,
      trialEndsAt: null,
    };
  }

  const planId = user.planId as PlanId;
  const planStatus = user.planStatus as PlanStatus;
  const now = new Date();

  if (planId === "trial") {
    scheduleLazyExpireTrial(user);
    const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const trialActive = trialEndsAt ? trialEndsAt > now : false;
    if (trialActive && planStatus === "active") {
      return {
        planId,
        effectivePlanId: "pro",
        planStatus,
        isTrial: true,
        isActive: true,
        trialEndsAt,
      };
    }
    return {
      planId,
      effectivePlanId: "starter",
      planStatus: trialActive ? planStatus : "expired",
      isTrial: false,
      isActive: false,
      trialEndsAt,
    };
  }

  if (planStatus !== "active") {
    return {
      planId,
      effectivePlanId: "starter",
      planStatus,
      isTrial: false,
      isActive: false,
      trialEndsAt: null,
    };
  }

  if (user.planExpiresAt && new Date(user.planExpiresAt) < now) {
    return {
      planId,
      effectivePlanId: "starter",
      planStatus: "expired",
      isTrial: false,
      isActive: false,
      trialEndsAt: null,
    };
  }

  return {
    planId,
    effectivePlanId: planId,
    planStatus,
    isTrial: false,
    isActive: true,
    trialEndsAt: null,
  };
}

export async function buildSubscriptionInfo(user: User): Promise<SubscriptionInfo> {
  await lazyExpireTrialIfNeeded(user);
  const catalog = await getPlanCatalog();
  const resolved = resolveEffectivePlan(user);
  const limits = await getEffectiveLimits(user, resolved.effectivePlanId);
  const monthStart = startOfMonth();

  const [searchesThisMonth, aiCallsThisMonth, pipelineItems, watchlistItems, creditsUsedThisMonth, creditWallet] =
    await Promise.all([
      countUserEventsSince(user.id, "search_query", monthStart),
      countUserEventsSince(user.id, "ai_call", monthStart),
      countPipelineItems(user.id),
      countWatchlistItems(user.id),
      countCreditsSpentThisMonth(user.id),
      getCreditWallet(user),
    ]);

  const daysLeftInTrial =
    resolved.isTrial && resolved.trialEndsAt
      ? daysBetween(new Date(), resolved.trialEndsAt)
      : null;

  return {
    planId: resolved.planId,
    effectivePlanId: resolved.effectivePlanId,
    planStatus: resolved.planStatus,
    displayName: formatPlanDisplayName(resolved.planId, resolved.isTrial, catalog),
    isTrial: resolved.isTrial,
    isActive: resolved.isActive || isAdmin(user),
    trialEndsAt: resolved.trialEndsAt,
    daysLeftInTrial,
    planExpiresAt: user.planExpiresAt ? new Date(user.planExpiresAt) : null,
    features:
      resolved.isActive || isAdmin(user)
        ? getPlanFromCatalog(resolved.effectivePlanId, catalog).featureIds
        : [],
    limits,
    usage: {
      searchesThisMonth,
      aiCallsThisMonth,
      pipelineItems,
      watchlistItems,
      creditsUsedThisMonth,
    },
    credits: {
      balance: creditWallet.balance,
      monthlyAllowance: creditWallet.monthlyAllowance,
      remaining: isUnlimitedCredits(creditWallet.monthlyAllowance)
        ? null
        : creditWallet.balance,
    },
    canStartTrial: !user.hasUsedTrial && !isAdmin(user),
    hasStripeCustomer: Boolean(user.stripeCustomerId),
  };
}

export async function assertFeatureAccess(user: User, feature: FeatureId): Promise<void> {
  if (isAdmin(user)) return;

  const catalog = await getPlanCatalog();
  const resolved = resolveEffectivePlan(user);
  if (!planHasFeature(resolved.effectivePlanId, feature, catalog)) {
    const requiredPlan = minimumPlanForFeature(feature, catalog);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${PLAN_FORBIDDEN_ERR_MSG}: Upgrade to ${getPlanFromCatalog(requiredPlan, catalog).name} or higher.`,
    });
  }
}

export async function assertSearchQuota(user: User): Promise<void> {
  if (isAdmin(user)) return;
  const sub = await buildSubscriptionInfo(user);
  const limit = sub.limits.searchesPerMonth;
  if (isUnlimited(limit)) return;
  if (sub.usage.searchesThisMonth >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${PLAN_LIMIT_ERR_MSG}: ${limit} searches/month on ${sub.displayName}.`,
    });
  }
}

export async function assertAiQuota(user: User): Promise<void> {
  if (isAdmin(user)) return;
  const sub = await buildSubscriptionInfo(user);
  const limit = sub.limits.aiCallsPerMonth;
  if (isUnlimited(limit)) return;
  if (limit === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${PLAN_FORBIDDEN_ERR_MSG}: AI features require Pro or higher.`,
    });
  }
  if (sub.usage.aiCallsThisMonth >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${PLAN_LIMIT_ERR_MSG}: ${limit} AI calls/month on ${sub.displayName}.`,
    });
  }
}

export async function assertPipelineQuota(user: User): Promise<void> {
  if (isAdmin(user)) return;
  const sub = await buildSubscriptionInfo(user);
  const limit = sub.limits.pipelineItems;
  if (isUnlimited(limit)) return;
  if (sub.usage.pipelineItems >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${PLAN_LIMIT_ERR_MSG}: ${limit} pipeline products on ${sub.displayName}.`,
    });
  }
}

export async function assertWatchlistQuota(user: User): Promise<void> {
  if (isAdmin(user)) return;
  const sub = await buildSubscriptionInfo(user);
  const limit = sub.limits.watchlistItems;
  if (isUnlimited(limit)) return;
  if (sub.usage.watchlistItems >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${PLAN_LIMIT_ERR_MSG}: ${limit} watchlist items on ${sub.displayName}.`,
    });
  }
}

export async function createTrialFields(now = new Date()) {
  const trialDays = await getTrialDays();
  return {
    planId: "trial" as const,
    planStatus: "active" as const,
    trialStartedAt: now,
    trialEndsAt: addDays(now, trialDays),
    hasUsedTrial: true,
    planStartedAt: now,
  };
}

export async function assignPaidPlan(userId: number, planId: PlanId): Promise<void> {
  const now = new Date();
  await updateUserSubscription(userId, {
    planId,
    planStatus: "active",
    planStartedAt: now,
    planExpiresAt: null,
    trialEndsAt: null,
  });
}

export async function startTrialForUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("User not found");
  if (user.hasUsedTrial) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Trial already used on this account.",
    });
  }
  const now = new Date();
  await updateUserSubscription(userId, await createTrialFields(now));
}

export async function expireStaleTrials(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db
    .update(users)
    .set({ planStatus: "expired" })
    .where(
      and(
        eq(users.planId, "trial"),
        isNotNull(users.trialEndsAt),
        lt(users.trialEndsAt, now)
      )
    );
}
