import type { Request, Response } from "express";
import type Stripe from "stripe";
import type { PlanId } from "@shared/plans";
import { getStripeClient, isStripeConfigured, planIdFromStripePrice } from "./stripe";
import { getCreditPack } from "@shared/credits";
import { creditPurchaseExists, grantCredits } from "./credits";
import { ENV } from "./_core/env";
import {
  getUserById,
  isStripeWebhookProcessed,
  markStripeWebhookProcessed,
  updateUserSubscription,
} from "./db";

function planIdFromMetadata(value: string | undefined): PlanId | null {
  const allowed: readonly string[] = ["starter", "pro", "business", "agency"];
  return value && allowed.includes(value) ? (value as PlanId) : null;
}

function subscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

async function handleCreditPackPurchase(session: Stripe.Checkout.Session): Promise<void> {
  const paymentStatus = session.payment_status;
  if (paymentStatus && paymentStatus !== "paid") {
    return;
  }

  const userId = Number(session.metadata?.userId);
  const packId = session.metadata?.packId;
  const credits = Number(session.metadata?.credits);
  if (!userId || !packId || !Number.isFinite(credits) || credits <= 0) return;

  const pack = getCreditPack(packId);
  if (!pack || pack.credits !== credits) {
    console.warn(`[Stripe] Credit pack metadata mismatch for session ${session.id}`);
    return;
  }

  if (await creditPurchaseExists(session.id)) {
    return;
  }

  const user = await getUserById(userId);
  if (!user) return;

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  if (customerId && user.stripeCustomerId && customerId !== user.stripeCustomerId) {
    console.warn(`[Stripe] Customer mismatch for credit purchase user ${userId}`);
    return;
  }

  await grantCredits(userId, credits, "purchase", {
    stripeSessionId: session.id,
    packId: pack.id,
    amountPaid: session.amount_total,
    currency: session.currency,
  });

  if (customerId && !user.stripeCustomerId) {
    await updateUserSubscription(userId, { stripeCustomerId: customerId });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.type === "credit_pack") {
    await handleCreditPackPurchase(session);
    return;
  }

  const paymentStatus = session.payment_status;
  if (paymentStatus && paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
    return;
  }

  const userId = Number(session.metadata?.userId);
  const planId = planIdFromMetadata(session.metadata?.planId);
  if (!userId || !planId) return;

  const user = await getUserById(userId);
  if (!user) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (customerId && user.stripeCustomerId && customerId !== user.stripeCustomerId) {
    console.warn(`[Stripe] Customer mismatch for user ${userId}`);
    return;
  }

  await updateUserSubscription(userId, {
    planId,
    planStatus: "active",
    planStartedAt: new Date(),
    planExpiresAt: null,
    trialEndsAt: null,
    stripeCustomerId: customerId ?? user.stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = Number(subscription.metadata?.userId);
  if (!userId) return;

  const user = await getUserById(userId);
  if (!user) return;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  if (customerId && user.stripeCustomerId && customerId !== user.stripeCustomerId) {
    console.warn(`[Stripe] Customer mismatch for user ${userId} on subscription update`);
    return;
  }

  const pricePlanId = planIdFromStripePrice(subscriptionPriceId(subscription));
  const metadataPlanId = planIdFromMetadata(subscription.metadata?.planId);
  const planId = pricePlanId ?? metadataPlanId;
  const status = subscription.status;

  if (status === "active" || status === "trialing") {
    await updateUserSubscription(userId, {
      ...(planId ? { planId } : {}),
      planStatus: "active",
      stripeSubscriptionId: subscription.id,
    });
    return;
  }

  if (status === "past_due") {
    await updateUserSubscription(userId, {
      planStatus: "expired",
      stripeSubscriptionId: subscription.id,
    });
    return;
  }

  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    await updateUserSubscription(userId, {
      planStatus: "cancelled",
      stripeSubscriptionId: subscription.id,
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = Number(subscription.metadata?.userId);
  if (!userId) return;

  await updateUserSubscription(userId, {
    planStatus: "cancelled",
    stripeSubscriptionId: null,
  });
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  if (!isStripeConfigured()) {
    res.status(503).send("Stripe not configured");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).send("Missing stripe-signature");
    return;
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      ENV.stripeWebhookSecret
    );
  } catch (err) {
    console.error("[Stripe] Webhook signature verification failed:", err);
    res.status(400).send("Invalid signature");
    return;
  }

  if (await isStripeWebhookProcessed(event.id)) {
    res.json({ received: true, duplicate: true });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    await markStripeWebhookProcessed(event.id, event.type);
    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe] Webhook handler error:", err);
    res.status(500).send("Webhook handler failed");
  }
}
