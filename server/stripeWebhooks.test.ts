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
  beforeEach(() => {
    vi.clearAllMocks();
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
});
