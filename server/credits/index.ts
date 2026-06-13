import type { User } from "../../drizzle/schema";
import {
  creditCost,
  type CreditAction,
  isUnlimitedCredits,
  PLAN_LIVE_CREDITS,
} from "@shared/credits";
import type { PlanId } from "@shared/plans";
import { TRPCError } from "@trpc/server";
import { eq, and, gte, sql } from "drizzle-orm";
import { creditTransactions, userCredits } from "../../drizzle/schema";
import { getDb } from "../db";
import { assertSubscriptionActive, isAdmin, resolveEffectivePlan } from "../plans";

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function nextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function monthlyCreditAllowance(planId: PlanId): number {
  return PLAN_LIVE_CREDITS[planId] ?? 0;
}

async function ensureWallet(user: User, allowance: number) {
  const db = await getDb();
  if (!db) return;

  const rows = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, user.id))
    .limit(1);

  const resetAt = nextMonthStart();

  if (rows.length === 0) {
    await db.insert(userCredits).values({
      userId: user.id,
      balance: allowance,
      purchasedBalance: 0,
      monthlyAllowance: allowance,
      resetAt,
    });
    if (allowance > 0) {
      await db.insert(creditTransactions).values({
        userId: user.id,
        amount: allowance,
        type: "monthly_grant",
        action: "monthly_reset",
        metadata: { planId: resolveEffectivePlan(user).effectivePlanId },
      });
    }
    return;
  }

  const wallet = rows[0]!;
  const needsReset =
    !wallet.resetAt || new Date(wallet.resetAt) <= new Date();

  if (needsReset && !isUnlimitedCredits(allowance)) {
    const purchased = wallet.purchasedBalance ?? 0;
    const newBalance = allowance + purchased;
    await db
      .update(userCredits)
      .set({
        balance: newBalance,
        monthlyAllowance: allowance,
        resetAt,
      })
      .where(eq(userCredits.userId, user.id));

    await db.insert(creditTransactions).values({
      userId: user.id,
      amount: allowance,
      type: "monthly_grant",
      action: "monthly_reset",
      metadata: { previousBalance: wallet.balance },
    });
  }
}

function fallbackWallet(user: User, allowance: number) {
  return {
    balance: isAdmin(user) ? 999999 : allowance,
    monthlyAllowance: isAdmin(user) ? -1 : allowance,
    remaining: isAdmin(user) ? null : allowance,
  };
}

export async function getCreditWallet(user: User) {
  const { effectivePlanId } = resolveEffectivePlan(user);
  const allowance = monthlyCreditAllowance(effectivePlanId);

  if (!isAdmin(user)) {
    try {
      await ensureWallet(user, allowance);
    } catch (err) {
      console.warn("[Credits] ensureWallet failed:", err);
    }
  }

  const db = await getDb();
  if (!db) {
    return fallbackWallet(user, allowance);
  }

  if (isAdmin(user)) {
    return { balance: 999999, monthlyAllowance: -1, remaining: null };
  }

  try {
    const rows = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, user.id))
      .limit(1);

    const wallet = rows[0];
    const balance = wallet?.balance ?? allowance;
    const monthlyAllowance = wallet?.monthlyAllowance ?? allowance;

    return {
      balance,
      monthlyAllowance,
      remaining: isUnlimitedCredits(monthlyAllowance) ? null : balance,
    };
  } catch (err) {
    console.warn("[Credits] wallet read failed:", err);
    return fallbackWallet(user, allowance);
  }
}

export async function countCreditsSpentThisMonth(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)` })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.type, "spend"),
        gte(creditTransactions.createdAt, startOfMonth())
      )
    );

  return Number(result[0]?.total ?? 0);
}

export async function assertCreditBalance(
  user: User,
  action: CreditAction
): Promise<number> {
  if (isAdmin(user)) return 0;

  const cost = creditCost(action);
  if (cost === 0) return 0;

  const wallet = await getCreditWallet(user);
  const allowance = wallet.monthlyAllowance;

  if (allowance === 0 && wallet.balance <= 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Live data requires credits. Upgrade to Pro for monthly credits or use cached Discover results (free).",
    });
  }

  if (!isUnlimitedCredits(allowance) && wallet.balance < cost) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Not enough credits (${wallet.balance} left, ${cost} required). Cached search is free.`,
    });
  }

  return cost;
}

export async function spendCredits(
  user: User,
  action: CreditAction,
  metadata?: Record<string, unknown>
): Promise<number> {
  if (isAdmin(user)) return 0;

  assertSubscriptionActive(user);

  const cost = creditCost(action);
  if (cost === 0) return 0;

  await assertCreditBalance(user, action);

  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Credits service unavailable. Please try again shortly.",
    });
  }

  const result = await db
    .update(userCredits)
    .set({ balance: sql`${userCredits.balance} - ${cost}` })
    .where(and(eq(userCredits.userId, user.id), gte(userCredits.balance, cost)));

  const affectedRows =
    typeof result === "object" && result !== null && "affectedRows" in result
      ? Number((result as { affectedRows: number }).affectedRows)
      : 0;

  if (affectedRows === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Not enough credits (${cost} required). Cached data is free.`,
    });
  }

  await db.insert(creditTransactions).values({
    userId: user.id,
    amount: -cost,
    type: "spend",
    action,
    metadata: metadata ?? null,
  });

  return cost;
}

export async function creditPurchaseExists(stripeSessionId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const rows = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.type, "purchase"),
        eq(creditTransactions.stripeSessionId, stripeSessionId)
      )
    )
    .limit(1);

  return rows.length > 0;
}

/** True when a live intel/search response returned fresh provider data worth charging for. */
export function isBillableLiveFetch(
  data: { isLive?: boolean; stale?: boolean } | null | undefined
): boolean {
  return Boolean(data?.isLive && !data?.stale);
}

export async function grantCredits(
  userId: number,
  amount: number,
  type: "admin_grant" | "purchase" | "refund" = "admin_grant",
  metadata?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;

  const persistsAcrossReset = type === "purchase" || type === "admin_grant" || type === "refund";

  const rows = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    await db.insert(userCredits).values({
      userId,
      balance: amount,
      purchasedBalance: persistsAcrossReset ? amount : 0,
      monthlyAllowance: 0,
      resetAt: nextMonthStart(),
    });
  } else {
    await db
      .update(userCredits)
      .set({
        balance: sql`${userCredits.balance} + ${amount}`,
        ...(persistsAcrossReset
          ? { purchasedBalance: sql`${userCredits.purchasedBalance} + ${amount}` }
          : {}),
      })
      .where(eq(userCredits.userId, userId));
  }

  await db.insert(creditTransactions).values({
    userId,
    amount,
    type,
    action: type,
    metadata: metadata ?? null,
    stripeSessionId:
      typeof metadata?.stripeSessionId === "string" ? metadata.stripeSessionId : null,
  });
}
