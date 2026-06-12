import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";
import { assertLiveSearchHourlyLimit, assertRateLimit } from "./rateLimit";

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

describe("assertRateLimit", () => {
  it("allows attempts within the limit", async () => {
    const key = `test:${Date.now()}`;
    await expect(assertRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
    await expect(assertRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
    await expect(assertRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
  });

  it("blocks attempts over the limit", async () => {
    const key = `test-block:${Date.now()}`;
    await assertRateLimit(key, 2, 60_000);
    await assertRateLimit(key, 2, 60_000);
    await expect(assertRateLimit(key, 2, 60_000)).rejects.toThrow(TRPCError);
  });
});

describe("assertLiveSearchHourlyLimit", () => {
  it("skips rate limit for admin users", async () => {
    const admin = mockUser({ id: 10_001, role: "admin", planId: "starter" });
    for (let i = 0; i < 15; i += 1) {
      await expect(assertLiveSearchHourlyLimit(admin)).resolves.toBeUndefined();
    }
  });

  it("allows agency plan unlimited live searches", async () => {
    const agency = mockUser({ id: 10_002, planId: "agency" });
    for (let i = 0; i < 15; i += 1) {
      await expect(assertLiveSearchHourlyLimit(agency)).resolves.toBeUndefined();
    }
  });

  it("blocks starter plan after 10 live searches per hour", async () => {
    const starter = mockUser({ id: 10_003, planId: "starter" });
    for (let i = 0; i < 10; i += 1) {
      await expect(assertLiveSearchHourlyLimit(starter)).resolves.toBeUndefined();
    }
    await expect(assertLiveSearchHourlyLimit(starter)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: expect.stringContaining("10/hour"),
    });
  });

  it("uses separate buckets per user", async () => {
    const userA = mockUser({ id: 10_004, planId: "starter" });
    const userB = mockUser({ id: 10_005, planId: "starter" });

    for (let i = 0; i < 10; i += 1) {
      await assertLiveSearchHourlyLimit(userA);
    }
    await expect(assertLiveSearchHourlyLimit(userA)).rejects.toThrow(TRPCError);
    await expect(assertLiveSearchHourlyLimit(userB)).resolves.toBeUndefined();
  });
});
