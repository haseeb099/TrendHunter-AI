import type { LimitOverrides } from "@shared/adminTypes";
import { getPlanFromCatalog, type PlanId } from "@shared/plans";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { couponRedemptions, coupons, users } from "../drizzle/schema";
import { getDb } from "./db";
import { getPlanCatalog } from "./planCatalog";
import { resolveEffectivePlan } from "./plans";
import { getStripeClient, isStripeConfigured } from "./stripe";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function redeemCouponForUser(user: User, rawCode: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const code = rawCode.trim().toUpperCase();
  if (!code) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a coupon code." });
  }

  return db.transaction(async (tx) => {
    const rows = await tx.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    const coupon = rows[0];
    if (!coupon || !coupon.isActive) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or inactive coupon." });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This coupon has expired." });
    }

    if (coupon.maxRedemptions >= 0 && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This coupon has reached its redemption limit." });
    }

    const prior = await tx
      .select()
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, user.id)))
      .limit(1);

    if (prior.length > 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You have already redeemed this coupon." });
    }

    let message = "Coupon applied successfully.";
    let stripePromotionCodeId: string | null = null;

    switch (coupon.couponType) {
      case "grant_plan": {
        const planId = coupon.grantPlanId as PlanId | null;
        if (!planId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon misconfigured." });
        }
        const now = new Date();
        await tx
          .update(users)
          .set({
            planId,
            planStatus: "active",
            planStartedAt: now,
            planExpiresAt: null,
            trialEndsAt: null,
          })
          .where(eq(users.id, user.id));
        message = `Plan upgraded to ${planId}.`;
        break;
      }
      case "extend_trial": {
        const base = user.trialEndsAt ? new Date(user.trialEndsAt) : new Date();
        const days = Math.round(coupon.value);
        await tx
          .update(users)
          .set({
            planId: "trial",
            planStatus: "active",
            trialEndsAt: addDays(base, days),
          })
          .where(eq(users.id, user.id));
        message = `Trial extended by ${days} day${days === 1 ? "" : "s"}.`;
        break;
      }
      case "extend_subscription": {
        const base = user.planExpiresAt ? new Date(user.planExpiresAt) : new Date();
        const days = Math.round(coupon.value);
        await tx
          .update(users)
          .set({
            planStatus: "active",
            planExpiresAt: addDays(base, days),
          })
          .where(eq(users.id, user.id));
        message = `Subscription extended by ${days} day${days === 1 ? "" : "s"}.`;
        break;
      }
      case "bonus_searches": {
        const bonus = Math.round(coupon.value);
        const catalog = await getPlanCatalog();
        const resolved = resolveEffectivePlan(user);
        const baseLimit = getPlanFromCatalog(resolved.effectivePlanId, catalog).limits.searchesPerMonth;
        const current = (user.limitOverrides ?? {}) as LimitOverrides;
        const existing = current.searchesPerMonth ?? baseLimit;
        await tx
          .update(users)
          .set({
            limitOverrides: {
              ...current,
              searchesPerMonth: existing + bonus,
            },
          })
          .where(eq(users.id, user.id));
        message = `Added ${bonus} bonus searches to your monthly limit.`;
        break;
      }
      case "discount_percent": {
        const percent = Math.round(coupon.value);
        if (isStripeConfigured()) {
          const stripe = getStripeClient();
          const stripeCoupon = await stripe.coupons.create({
            percent_off: percent,
            duration: "once",
            name: `DropHunter ${code} (${percent}% off)`,
          });
          const promo = await stripe.promotionCodes.create({
            promotion: { type: "coupon", coupon: stripeCoupon.id },
            max_redemptions: 1,
            metadata: { userId: String(user.id), couponCode: code },
          });
          stripePromotionCodeId = promo.id;
          message = `${percent}% discount will be applied automatically at checkout.`;
        } else {
          message = `${percent}% discount noted — will apply at checkout when Stripe billing is live.`;
        }
        break;
      }
    }

    await tx.insert(couponRedemptions).values({
      couponId: coupon.id,
      userId: user.id,
      stripePromotionCodeId,
    });

    if (coupon.couponType !== "discount_percent") {
      await tx
        .update(coupons)
        .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
        .where(eq(coupons.id, coupon.id));
    }

    return message;
  });
}
