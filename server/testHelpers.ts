import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

export function createTestUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "local",
    role: "user",
    passwordHash: "salt:hash",
    planId: "pro",
    planStatus: "active",
    trialStartedAt: null,
    trialEndsAt: null,
    planStartedAt: now,
    planExpiresAt: null,
    hasUsedTrial: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    accountStatus: "active",
    flagReason: null,
    adminNotes: null,
    limitOverrides: null,
    pausedUntil: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    ...overrides,
  };
}

export function createTestContext(user: User | null = createTestUser()): TrpcContext {
  return {
    user,
    req: { protocol: "http", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}
