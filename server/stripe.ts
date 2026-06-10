import Stripe from "stripe";
import type { PlanId } from "@shared/plans";
import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import { getUserById, updateUserSubscription } from "./db";
import { ENV } from "./_core/env";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(
    (process.env.STRIPE_SECRET_KEY?.trim() || ENV.stripeSecretKey) &&
      (process.env.STRIPE_WEBHOOK_SECRET?.trim() || ENV.stripeWebhookSecret)
  );
}

export function getStripeClient(): Stripe {
  if (!ENV.stripeSecretKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Stripe is not configured.",
    });
  }
  if (!stripeClient) {
    stripeClient = new Stripe(ENV.stripeSecretKey);
  }
  return stripeClient;
}

const PRICE_ENV_MAP: Record<Exclude<PlanId, "trial">, keyof typeof ENV> = {
  starter: "stripePriceStarter",
  pro: "stripePricePro",
  business: "stripePriceBusiness",
  agency: "stripePriceAgency",
};

const STRIPE_PRICE_ENV: Record<Exclude<PlanId, "trial">, string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  business: "STRIPE_PRICE_BUSINESS",
  agency: "STRIPE_PRICE_AGENCY",
};

export function getStripePriceId(planId: PlanId): string | null {
  if (planId === "trial") return null;
  const envKey = STRIPE_PRICE_ENV[planId];
  const fromConfig = ENV[PRICE_ENV_MAP[planId]];
  const value =
    process.env[envKey]?.trim() ||
    (typeof fromConfig === "string" ? fromConfig : "");
  return value.length > 0 ? value : null;
}

export function requireStripePriceId(planId: PlanId): string {
  const priceId = getStripePriceId(planId);
  if (!priceId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Stripe price not configured for plan: ${planId}`,
    });
  }
  return priceId;
}

export async function getOrCreateStripeCustomer(user: User): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId: String(user.id), openId: user.openId },
  });

  await updateUserSubscription(user.id, { stripeCustomerId: customer.id });
  return customer.id;
}

export function billingReturnUrl(path = "/dashboard/billing"): string {
  const base = ENV.appUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function planIdFromStripePrice(priceId: string | undefined | null): PlanId | null {
  if (!priceId) return null;
  const paidPlans: Exclude<PlanId, "trial">[] = ["starter", "pro", "business", "agency"];
  for (const planId of paidPlans) {
    if (getStripePriceId(planId) === priceId) return planId;
  }
  return null;
}
