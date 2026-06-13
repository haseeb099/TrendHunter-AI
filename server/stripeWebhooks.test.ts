import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { handleStripeWebhook } from "./stripeWebhooks";

vi.mock("./stripe", () => ({
  isStripeConfigured: vi.fn(() => true),
  getStripeClient: vi.fn(),
  planIdFromStripePrice: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    isStripeWebhookProcessed: vi.fn(async () => false),
    markStripeWebhookProcessed: vi.fn(async () => undefined),
    markStripeDiscountConsumed: vi.fn(async () => undefined),
    getUserById: vi.fn(async (id: number) => ({
      id,
      stripeCustomerId: "cus_test",
      openId: "user-1",
    })),
    updateUserSubscription: vi.fn(async () => undefined),
  };
});

vi.mock("./credits", () => ({
  creditPurchaseExists: vi.fn(async () => false),
  grantCredits: vi.fn(async () => undefined),
}));

function mockRes() {
  const res = {
    statusCode: 200,
    body: "",
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: string) {
      this.body = payload;
      return this;
    },
    json(payload: unknown) {
      this.body = JSON.stringify(payload);
      return this;
    },
  };
  return res;
}

describe("stripe webhooks — credit packs", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import("./db");
    vi.mocked(db.getUserById).mockResolvedValue({
      id: 42,
      stripeCustomerId: "cus_test",
      openId: "user-1",
    } as never);
    vi.mocked(db.isStripeWebhookProcessed).mockResolvedValue(false);
  });

  it("grants credits on credit_pack checkout.session.completed", async () => {
    const { getStripeClient } = await import("./stripe");
    const { grantCredits } = await import("./credits");

    vi.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: "evt_credit_1",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_credit_1",
              mode: "payment",
              payment_status: "paid",
              customer: "cus_test",
              metadata: {
                userId: "42",
                type: "credit_pack",
                packId: "pack_100",
                credits: "100",
              },
            } satisfies Partial<Stripe.Checkout.Session>,
          },
        })),
      },
    } as never);

    const req = {
      headers: { "stripe-signature": "sig" },
      body: Buffer.from("{}"),
    } as never;
    const res = mockRes();

    await handleStripeWebhook(req, res as never);

    expect(grantCredits).toHaveBeenCalledWith(42, 100, "purchase", {
      stripeSessionId: "cs_credit_1",
      packId: "pack_100",
      amountPaid: undefined,
      currency: undefined,
    });
    expect(res.statusCode).toBe(200);
  });

  it("deduplicates webhook events", async () => {
    const { getStripeClient } = await import("./stripe");
    const { isStripeWebhookProcessed } = await import("./db");

    vi.mocked(isStripeWebhookProcessed).mockResolvedValue(true);
    vi.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: "evt_dup",
          type: "checkout.session.completed",
          data: { object: { id: "cs_dup" } },
        })),
      },
    } as never);

    const req = { headers: { "stripe-signature": "sig" }, body: Buffer.from("{}") } as never;
    const res = mockRes();
    await handleStripeWebhook(req, res as never);
    expect(JSON.parse(res.body)).toMatchObject({ duplicate: true });
  });

  it("marks discount consumed on subscription checkout with discount", async () => {
    const { getStripeClient } = await import("./stripe");
    const { markStripeDiscountConsumed } = await import("./db");

    vi.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: "evt_sub_disc",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_sub_1",
              payment_status: "paid",
              customer: "cus_test",
              subscription: "sub_1",
              total_details: { amount_discount: 500 },
              metadata: { userId: "42", planId: "pro" },
            },
          },
        })),
      },
    } as never);

    const req = { headers: { "stripe-signature": "sig" }, body: Buffer.from("{}") } as never;
    const res = mockRes();
    await handleStripeWebhook(req, res as never);

    expect(markStripeDiscountConsumed).toHaveBeenCalledWith(42, "cs_sub_1");
    expect(res.statusCode).toBe(200);
  });

  it("refreshes plan on invoice.payment_succeeded", async () => {
    const { getStripeClient, planIdFromStripePrice } = await import("./stripe");
    const { updateUserSubscription } = await import("./db");

    vi.mocked(planIdFromStripePrice).mockReturnValue("pro");
    vi.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: "evt_inv_paid",
          type: "invoice.payment_succeeded",
          data: {
            object: {
              id: "in_1",
              subscription: "sub_renew",
            },
          },
        })),
      },
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: "sub_renew",
          metadata: { userId: "42" },
          items: { data: [{ price: { id: "price_pro" } }] },
        })),
      },
    } as never);

    const req = { headers: { "stripe-signature": "sig" }, body: Buffer.from("{}") } as never;
    const res = mockRes();
    await handleStripeWebhook(req, res as never);

    expect(updateUserSubscription).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ planStatus: "active", planId: "pro" })
    );
  });
});
