import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import {
  couponRedemptions,
  coupons,
  stripeWebhookEvents,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { getPlanCatalog } from "../planCatalog";
import type { PlanId } from "@shared/plans";

export type RevenueStats = {
  mrr: number;
  mrrByPlan: Array<{ planId: PlanId; subscribers: number; mrr: number }>;
  activeStripeSubscriptions: number;
  trialToPaidCount: number;
  trialToPaidRate: number;
  conversionsLast30d: number;
  churnLast30d: number;
  churnRate30d: number;
  couponStats: {
    totalCoupons: number;
    totalRedemptions: number;
    redemptionsLast30d: number;
    topCoupons: Array<{ code: string; redemptions: number; couponType: string }>;
  };
  stripeWebhookEventsLast30d: Array<{ eventType: string; count: number }>;
};

export async function getRevenueStats(): Promise<RevenueStats> {
  const db = await getDb();
  const empty: RevenueStats = {
    mrr: 0,
    mrrByPlan: [],
    activeStripeSubscriptions: 0,
    trialToPaidCount: 0,
    trialToPaidRate: 0,
    conversionsLast30d: 0,
    churnLast30d: 0,
    churnRate30d: 0,
    couponStats: {
      totalCoupons: 0,
      totalRedemptions: 0,
      redemptionsLast30d: 0,
      topCoupons: [],
    },
    stripeWebhookEventsLast30d: [],
  };

  if (!db) return empty;

  const catalog = await getPlanCatalog();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const subscribers = await db
    .select({
      planId: users.planId,
      id: users.id,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.stripeSubscriptionId),
        eq(users.planStatus, "active"),
        sql`${users.planId} != 'trial'`
      )
    );

  const mrrByPlanMap = new Map<PlanId, { subscribers: number; mrr: number }>();
  let mrr = 0;

  for (const sub of subscribers) {
    const planId = sub.planId as PlanId;
    const price = catalog[planId]?.priceMonthly ?? 0;
    mrr += price;
    const existing = mrrByPlanMap.get(planId) ?? { subscribers: 0, mrr: 0 };
    mrrByPlanMap.set(planId, {
      subscribers: existing.subscribers + 1,
      mrr: existing.mrr + price,
    });
  }

  const mrrByPlan = Array.from(mrrByPlanMap.entries())
    .map(([planId, stats]) => ({ planId, ...stats }))
    .sort((a, b) => b.mrr - a.mrr);

  const [trialEverRow, trialToPaidRow, conversionsRow, churnWebhookRow, churnUserRow] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.hasUsedTrial} = true OR ${users.planId} = 'trial'`),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.hasUsedTrial, true),
            isNotNull(users.stripeSubscriptionId),
            eq(users.planStatus, "active"),
            sql`${users.planId} != 'trial'`
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            isNotNull(users.stripeSubscriptionId),
            eq(users.planStatus, "active"),
            sql`${users.planId} != 'trial'`,
            gte(users.planStartedAt, thirtyDaysAgo)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(stripeWebhookEvents)
        .where(
          and(
            eq(stripeWebhookEvents.eventType, "customer.subscription.deleted"),
            gte(stripeWebhookEvents.processedAt, thirtyDaysAgo)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.planStatus, "cancelled"),
            gte(users.updatedAt, thirtyDaysAgo),
            isNotNull(users.stripeSubscriptionId)
          )
        ),
    ]);

  const trialEver = Number(trialEverRow[0]?.count ?? 0);
  const trialToPaidCount = Number(trialToPaidRow[0]?.count ?? 0);
  const trialToPaidRate = trialEver > 0 ? Math.round((trialToPaidCount / trialEver) * 1000) / 10 : 0;
  const conversionsLast30d = Number(conversionsRow[0]?.count ?? 0);
  const churnLast30d =
    Number(churnWebhookRow[0]?.count ?? 0) + Number(churnUserRow[0]?.count ?? 0);
  const activeAtStart = Math.max(subscribers.length + churnLast30d, 1);
  const churnRate30d = Math.round((churnLast30d / activeAtStart) * 1000) / 10;

  const [couponCountRow, redemptionCountRow, redemption30dRow, topCouponRows, webhookEventRows] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(coupons),
      db.select({ count: sql<number>`count(*)` }).from(couponRedemptions),
      db
        .select({ count: sql<number>`count(*)` })
        .from(couponRedemptions)
        .where(gte(couponRedemptions.redeemedAt, thirtyDaysAgo)),
      db
        .select({
          code: coupons.code,
          couponType: coupons.couponType,
          redemptionCount: coupons.redemptionCount,
        })
        .from(coupons)
        .orderBy(sql`${coupons.redemptionCount} DESC`)
        .limit(5),
      db
        .select({
          eventType: stripeWebhookEvents.eventType,
          count: sql<number>`count(*)`,
        })
        .from(stripeWebhookEvents)
        .where(gte(stripeWebhookEvents.processedAt, thirtyDaysAgo))
        .groupBy(stripeWebhookEvents.eventType),
    ]);

  return {
    mrr,
    mrrByPlan,
    activeStripeSubscriptions: subscribers.length,
    trialToPaidCount,
    trialToPaidRate,
    conversionsLast30d,
    churnLast30d,
    churnRate30d,
    couponStats: {
      totalCoupons: Number(couponCountRow[0]?.count ?? 0),
      totalRedemptions: Number(redemptionCountRow[0]?.count ?? 0),
      redemptionsLast30d: Number(redemption30dRow[0]?.count ?? 0),
      topCoupons: topCouponRows.map((c) => ({
        code: c.code,
        redemptions: c.redemptionCount,
        couponType: c.couponType,
      })),
    },
    stripeWebhookEventsLast30d: webhookEventRows.map((r) => ({
      eventType: r.eventType,
      count: Number(r.count),
    })),
  };
}
