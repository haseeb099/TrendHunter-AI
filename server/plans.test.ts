import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { planHasFeature, PLAN_DEFINITIONS } from "@shared/plans";
import {
  assertAccountUsable,
  assertSubscriptionActive,
  buildSubscriptionInfo,
  resolveEffectivePlan,
} from "./plans";
import { TRPCError } from "@trpc/server";
import { ACCOUNT_FLAGGED_ERR_MSG, SUBSCRIPTION_INACTIVE_ERR_MSG } from "@shared/const";

function mockUser(overrides: Partial<User>): User {
  return {
    id: 1,
    openId: "test",
    name: "Test",
    email: "test@example.com",
    loginMethod: "local",
    role: "user",
    passwordHash: "hash",
    planId: "starter",
    planStatus: "active",
    trialStartedAt: null,
    trialEndsAt: null,
    planStartedAt: null,
    planExpiresAt: null,
    hasUsedTrial: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    accountStatus: "active",
    flagReason: null,
    adminNotes: null,
    limitOverrides: null,
    pausedUntil: null,
    termsAcceptedAt: null,
    privacyAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

describe("planHasFeature", () => {
  it("starter includes discover but not validate", () => {
    expect(planHasFeature("starter", "discover")).toBe(true);
    expect(planHasFeature("starter", "validate")).toBe(false);
  });

  it("pro includes AI features", () => {
    expect(planHasFeature("pro", "validate")).toBe(true);
    expect(planHasFeature("pro", "agent")).toBe(true);
  });
});

describe("resolveEffectivePlan", () => {
  it("active trial maps to pro access", () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const user = mockUser({
      planId: "trial",
      planStatus: "active",
      trialEndsAt: future,
    });
    const resolved = resolveEffectivePlan(user);
    expect(resolved.effectivePlanId).toBe("pro");
    expect(resolved.isTrial).toBe(true);
  });

  it("expired trial falls back to starter", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const user = mockUser({
      planId: "trial",
      planStatus: "active",
      trialEndsAt: past,
    });
    const resolved = resolveEffectivePlan(user);
    expect(resolved.effectivePlanId).toBe("starter");
    expect(resolved.isTrial).toBe(false);
  });

  it("flagged users are blocked by assertAccountUsable", () => {
    const user = mockUser({ accountStatus: "flagged", flagReason: "Suspicious activity" });
    expect(() => assertAccountUsable(user)).toThrow(TRPCError);
    try {
      assertAccountUsable(user);
    } catch (err) {
      expect((err as TRPCError).message).toBe(ACCOUNT_FLAGGED_ERR_MSG);
    }
  });

  it("admins bypass flagged status", () => {
    const user = mockUser({ role: "admin", accountStatus: "flagged" });
    expect(() => assertAccountUsable(user)).not.toThrow();
  });

  it("agency user gets agency features", () => {
    const user = mockUser({ planId: "agency", planStatus: "active" });
    const resolved = resolveEffectivePlan(user);
    expect(resolved.effectivePlanId).toBe("agency");
    expect(PLAN_DEFINITIONS.agency.featureIds.length).toBeGreaterThan(
      PLAN_DEFINITIONS.starter.featureIds.length
    );
  });

  it("expired paid plan is inactive", () => {
    const user = mockUser({ planId: "pro", planStatus: "expired" });
    const resolved = resolveEffectivePlan(user);
    expect(resolved.isActive).toBe(false);
  });
});

describe("assertSubscriptionActive", () => {
  it("blocks inactive subscriptions", () => {
    const user = mockUser({ planId: "pro", planStatus: "expired" });
    expect(() => assertSubscriptionActive(user)).toThrow(TRPCError);
    try {
      assertSubscriptionActive(user);
    } catch (err) {
      expect((err as TRPCError).message).toBe(SUBSCRIPTION_INACTIVE_ERR_MSG);
    }
  });

  it("allows active subscriptions", () => {
    const user = mockUser({ planId: "pro", planStatus: "active" });
    expect(() => assertSubscriptionActive(user)).not.toThrow();
  });

  it("admins bypass subscription check", () => {
    const user = mockUser({ role: "admin", planId: "starter", planStatus: "expired" });
    expect(() => assertSubscriptionActive(user)).not.toThrow();
  });
});

describe("buildSubscriptionInfo hard paywall", () => {
  it("returns empty features when subscription is inactive", async () => {
    const user = mockUser({ planId: "pro", planStatus: "expired" });
    const sub = await buildSubscriptionInfo(user);
    expect(sub.isActive).toBe(false);
    expect(sub.features).toEqual([]);
  });
});
