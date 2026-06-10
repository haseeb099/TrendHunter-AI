import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { createTestContext, createTestUser } from "./testHelpers";
import * as planCatalog from "./planCatalog";
import * as stripeModule from "./stripe";

vi.mock("./stripe", async () => {
  const actual = await vi.importActual<typeof import("./stripe")>("./stripe");
  return {
    ...actual,
    isStripeConfigured: vi.fn(() => false),
    getStripeClient: vi.fn(),
    getOrCreateStripeCustomer: vi.fn(),
    requireStripePriceId: vi.fn(),
    billingReturnUrl: vi.fn(() => "http://localhost:3000/dashboard/billing"),
  };
});

vi.mock("./planCatalog", async () => {
  const actual = await vi.importActual<typeof import("./planCatalog")>("./planCatalog");
  return {
    ...actual,
    getPlatformSettings: vi.fn(async () => ({
      self_serve_billing: true,
      trial_days: 3,
      registration_enabled: true,
    })),
    getPublicPlans: vi.fn(async () => []),
  };
});

vi.mock("./plans", async () => {
  const actual = await vi.importActual<typeof import("./plans")>("./plans");
  return {
    ...actual,
    assignPaidPlan: vi.fn().mockResolvedValue(undefined),
    buildSubscriptionInfo: vi.fn(async () => ({})),
  };
});

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getUserByOpenId: vi.fn(async () => createTestUser()),
    getActiveStripeDiscountForUser: vi.fn(async () => null),
  };
});

describe("billing router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selectPlan assigns plan when Stripe is not configured", async () => {
    const { assignPaidPlan } = await import("./plans");
    const caller = appRouter.createCaller(createTestContext());

    await caller.billing.selectPlan({ planId: "pro" });

    expect(assignPaidPlan).toHaveBeenCalledWith(1, "pro");
  });

  it("selectPlan is blocked when Stripe is configured", async () => {
    vi.mocked(stripeModule.isStripeConfigured).mockReturnValue(true);
    const caller = appRouter.createCaller(createTestContext());

    await expect(caller.billing.selectPlan({ planId: "pro" })).rejects.toThrow(TRPCError);
  });

  it("selectPlan is blocked when self-serve billing is off", async () => {
    vi.mocked(planCatalog.getPlatformSettings).mockResolvedValue({
      self_serve_billing: false,
      trial_days: 3,
      registration_enabled: true,
    });
    const caller = appRouter.createCaller(createTestContext());

    await expect(caller.billing.selectPlan({ planId: "pro" })).rejects.toThrow(TRPCError);
  });
});
