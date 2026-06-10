import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PAID_PLAN_IDS, type FeatureId, type PlanId } from "@shared/plans";
import { authenticatedProcedure, publicProcedure, router } from "./_core/trpc";
import { getActiveStripeDiscountForUser, getUserByOpenId } from "./db";
import { redeemCouponForUser } from "./coupons";
import { getPlanCatalog, getPlatformSettings, getPublicPlans } from "./planCatalog";
import { assignPaidPlan, buildSubscriptionInfo, startTrialForUser } from "./plans";
import { ENV } from "./_core/env";
import { type CreditPackId, CREDIT_PACKS, getCreditPack } from "@shared/credits";
import {
  billingReturnUrl,
  getOrCreateStripeCustomer,
  getStripeClient,
  isStripeConfigured,
  listConfiguredCreditPacks,
  requireStripeCreditPackPriceId,
  requireStripePriceId,
} from "./stripe";

const planIdSchema = z.enum(["trial", "starter", "pro", "business", "agency"]);

export const billingRouter = router({
  getPlans: publicProcedure.query(async () => {
    const [plans, settings] = await Promise.all([getPublicPlans(), getPlatformSettings()]);
    const stripeOn = isStripeConfigured();
    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        tagline: plan.tagline,
        priceMonthly: plan.priceMonthly,
        priceLabel: plan.priceLabel,
        billingPeriod: plan.billingPeriod,
        highlight: plan.highlight ?? false,
        features: plan.features,
        featureIds: plan.featureIds as FeatureId[],
        limits: plan.limits,
        isPaid: PAID_PLAN_IDS.includes(plan.id),
      })),
      selfServeBilling: settings.self_serve_billing === true,
      stripeConfigured: stripeOn,
      stripePublishableKey: stripeOn ? process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? null : null,
    };
  }),

  getSubscription: authenticatedProcedure.query(async ({ ctx }) => buildSubscriptionInfo(ctx.user)),

  createCheckoutSession: authenticatedProcedure
    .input(z.object({ planId: planIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getPlatformSettings();
      if (settings.self_serve_billing !== true) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Self-serve billing is disabled.",
        });
      }
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured. Use coupon codes or contact support.",
        });
      }
      if (!PAID_PLAN_IDS.includes(input.planId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan." });
      }

      const stripe = getStripeClient();
      const customerId = await getOrCreateStripeCustomer(ctx.user);
      const priceId = requireStripePriceId(input.planId as PlanId);
      const promotionCodeId = await getActiveStripeDiscountForUser(ctx.user.id);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${billingReturnUrl("/dashboard/billing")}?checkout=success`,
        cancel_url: `${billingReturnUrl("/dashboard/billing")}?checkout=cancel`,
        metadata: {
          userId: String(ctx.user.id),
          planId: input.planId,
        },
        subscription_data: {
          metadata: {
            userId: String(ctx.user.id),
            planId: input.planId,
          },
        },
        ...(promotionCodeId
          ? { discounts: [{ promotion_code: promotionCodeId }] }
          : { allow_promotion_codes: true }),
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session.",
        });
      }

      return { url: session.url };
    }),

  createPortalSession: authenticatedProcedure.mutation(async ({ ctx }) => {
    if (!isStripeConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured.",
      });
    }
    if (!ctx.user.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No billing account on file. Subscribe to a plan first.",
      });
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.user.stripeCustomerId,
      return_url: billingReturnUrl("/dashboard/billing"),
    });

    return { url: session.url };
  }),

  selectPlan: authenticatedProcedure
    .input(z.object({ planId: planIdSchema }))
    .mutation(async ({ ctx, input }) => {
      if (isStripeConfigured()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Use secure checkout to change plans.",
        });
      }

      if (ENV.isProduction) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Manual plan selection is disabled in production. Use checkout or a coupon.",
        });
      }

      const settings = await getPlatformSettings();
      if (settings.self_serve_billing !== true) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Self-serve plan changes are disabled. Use a coupon code or contact support to upgrade.",
        });
      }

      if (input.planId === "trial") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use startTrial for the free trial.",
        });
      }

      if (!PAID_PLAN_IDS.includes(input.planId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan." });
      }

      await assignPaidPlan(ctx.user.id, input.planId as PlanId);

      const fresh = await getUserByOpenId(ctx.user.openId);
      if (!fresh) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      return buildSubscriptionInfo(fresh);
    }),

  startTrial: authenticatedProcedure.mutation(async ({ ctx }) => {
    await startTrialForUser(ctx.user.id);

    const fresh = await getUserByOpenId(ctx.user.openId);
    if (!fresh) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    return buildSubscriptionInfo(fresh);
  }),

  redeemCoupon: authenticatedProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const message = await redeemCouponForUser(ctx.user, input.code);

      const fresh = await getUserByOpenId(ctx.user.openId);
      if (!fresh) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      return {
        message,
        subscription: await buildSubscriptionInfo(fresh),
      };
    }),

  getCreditPacks: authenticatedProcedure.query(() => {
    const stripeOn = isStripeConfigured();
    const packs = stripeOn ? listConfiguredCreditPacks() : [];
    return {
      stripeConfigured: stripeOn,
      packs,
      catalog: Object.values(CREDIT_PACKS),
    };
  }),

  createCreditCheckoutSession: authenticatedProcedure
    .input(z.object({ packId: z.enum(["pack_50", "pack_100", "pack_250"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Credit purchases require Stripe checkout.",
        });
      }

      const pack = getCreditPack(input.packId);
      if (!pack) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid credit pack." });
      }

      const stripe = getStripeClient();
      const customerId = await getOrCreateStripeCustomer(ctx.user);
      const priceId = requireStripeCreditPackPriceId(input.packId as CreditPackId);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${billingReturnUrl("/dashboard/billing")}?credits=success`,
        cancel_url: `${billingReturnUrl("/dashboard/billing")}?credits=cancel`,
        metadata: {
          userId: String(ctx.user.id),
          type: "credit_pack",
          packId: input.packId,
          credits: String(pack.credits),
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session.",
        });
      }

      return { url: session.url, packId: input.packId, credits: pack.credits };
    }),

  getUpgradeOptions: authenticatedProcedure.query(async ({ ctx }) => {
    const [sub, catalog, plans] = await Promise.all([
      buildSubscriptionInfo(ctx.user),
      getPlanCatalog(),
      getPublicPlans(),
    ]);

    const currentRank = catalog[sub.effectivePlanId].sortOrder;

    return plans.filter((p) => p.sortOrder > currentRank || p.id === "trial");
  }),
});
