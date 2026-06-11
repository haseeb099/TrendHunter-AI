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
    requireStripeCreditPackPriceId: vi.fn(() => "price_credits_100"),
    listConfiguredCreditPacks: vi.fn(() => []),
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

  it("createCreditCheckoutSession requires Stripe", async () => {
    const caller = appRouter.createCaller(createTestContext());
    await expect(
      caller.billing.createCreditCheckoutSession({ packId: "pack_100" })
    ).rejects.toThrow(TRPCError);
  });

  it("createCreditCheckoutSession returns checkout url when Stripe is on", async () => {
    vi.mocked(stripeModule.isStripeConfigured).mockReturnValue(true);
    vi.mocked(stripeModule.getStripeClient).mockReturnValue({
      checkout: {
        sessions: {
          create: vi.fn(async () => ({ url: "https://checkout.stripe.test/session" })),
        },
      },
    } as never);
    vi.mocked(stripeModule.getOrCreateStripeCustomer).mockResolvedValue("cus_test");

    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.billing.createCreditCheckoutSession({ packId: "pack_100" });

    expect(result.url).toContain("checkout.stripe.test");
    expect(result.credits).toBe(100);
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

  it("createCheckoutSession blocks agency self-serve", async () => {
    vi.mocked(stripeModule.isStripeConfigured).mockReturnValue(true);
    const caller = appRouter.createCaller(createTestContext());

    await expect(caller.billing.createCheckoutSession({ planId: "agency" })).rejects.toThrow(
      TRPCError
    );
  });

  it("selectPlan blocks agency self-serve", async () => {
    const caller = appRouter.createCaller(createTestContext());

    await expect(caller.billing.selectPlan({ planId: "agency" })).rejects.toThrow(TRPCError);
  });
});

describe("inactive subscription hard paywall", () => {
  it("blocks feature-gated intelligence routes", async () => {
    const { buildSubscriptionInfo: realBuild } = await vi.importActual<typeof import("./plans")>(
      "./plans"
    );
    vi.mocked((await import("./plans")).buildSubscriptionInfo).mockImplementation(realBuild);

    const inactiveUser = createTestUser({ planId: "pro", planStatus: "expired" });
    const caller = appRouter.createCaller(createTestContext(inactiveUser));

    await expect(
      caller.intelligence.getTrendPulse({ keyword: "yoga mat", live: false })
    ).rejects.toThrow(TRPCError);
  });

  it("blocks search for inactive subscriptions", async () => {
    const { buildSubscriptionInfo: realBuild } = await vi.importActual<typeof import("./plans")>(
      "./plans"
    );
    vi.mocked((await import("./plans")).buildSubscriptionInfo).mockImplementation(realBuild);

    const inactiveUser = createTestUser({ planId: "pro", planStatus: "expired" });
    const caller = appRouter.createCaller(createTestContext(inactiveUser));

    await expect(
      caller.search.searchProducts({
        query: "yoga mat",
        platform: "all",
        filters: { region: "US" },
      })
    ).rejects.toThrow(TRPCError);
  });

  it("blocks watchlist reads for inactive subscriptions", async () => {
    const { buildSubscriptionInfo: realBuild } = await vi.importActual<typeof import("./plans")>(
      "./plans"
    );
    vi.mocked((await import("./plans")).buildSubscriptionInfo).mockImplementation(realBuild);

    const inactiveUser = createTestUser({ planId: "pro", planStatus: "expired" });
    const caller = appRouter.createCaller(createTestContext(inactiveUser));

    await expect(caller.watchlist.getWatchlist()).rejects.toThrow(TRPCError);
  });

  it("allows billing subscription read for inactive users", async () => {
    const { buildSubscriptionInfo: realBuild } = await vi.importActual<typeof import("./plans")>(
      "./plans"
    );
    vi.mocked((await import("./plans")).buildSubscriptionInfo).mockImplementation(realBuild);

    const inactiveUser = createTestUser({ planId: "pro", planStatus: "expired" });
    const caller = appRouter.createCaller(createTestContext(inactiveUser));

    const sub = await caller.billing.getSubscription();
    expect(sub).toBeDefined();
  });
});
