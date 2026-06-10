import { describe, expect, it, vi, beforeEach } from "vitest";
import { getStripePriceId, isStripeConfigured } from "./stripe";

describe("stripe helpers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("isStripeConfigured is false without env vars", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(isStripeConfigured()).toBe(false);
  });

  it("isStripeConfigured is true when keys are set", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_abc");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_abc");
    expect(isStripeConfigured()).toBe(true);
  });

  it("getStripePriceId maps plan to env price", () => {
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro_test");
    expect(getStripePriceId("pro")).toBe("price_pro_test");
    expect(getStripePriceId("trial")).toBeNull();
  });
});
