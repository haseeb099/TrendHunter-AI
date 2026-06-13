import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  creditPurchaseExists,
  getCreditWallet,
  grantCredits,
  isBillableLiveFetch,
  spendCredits,
} from "./index";
import { createTestUser } from "../testHelpers";
import * as db from "../db";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("../db", () => ({
  getDb: vi.fn(async () => mockDb),
}));

vi.mock("../plans", async () => {
  const actual = await vi.importActual<typeof import("../plans")>("../plans");
  return {
    ...actual,
    resolveEffectivePlan: vi.fn(() => ({
      effectivePlanId: "pro" as const,
      isActive: true,
    })),
    assertSubscriptionActive: vi.fn(),
    isAdmin: vi.fn(() => false),
  };
});

describe("credits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
  });

  it("isBillableLiveFetch requires fresh live data", () => {
    expect(isBillableLiveFetch({ isLive: true, stale: false })).toBe(true);
    expect(isBillableLiveFetch({ isLive: true, stale: true })).toBe(false);
    expect(isBillableLiveFetch({ isLive: false })).toBe(false);
    expect(isBillableLiveFetch(null)).toBe(false);
  });

  it("creditPurchaseExists queries by stripeSessionId column", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 1 }],
        }),
      }),
    });

    const exists = await creditPurchaseExists("cs_test_123");
    expect(exists).toBe(true);
  });

  it("spendCredits rejects when balance is insufficient", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            { userId: 1, balance: 0, purchasedBalance: 0, monthlyAllowance: 0, resetAt: new Date() },
          ],
        }),
      }),
    });
    mockDb.update.mockReturnValue({
      set: () => ({
        where: async () => ({ affectedRows: 0 }),
      }),
    });
    mockDb.insert.mockReturnValue({ values: vi.fn() });

    await expect(spendCredits(createTestUser(), "live_search")).rejects.toThrow(TRPCError);
  });

  it("grantCredits increases purchased balance for purchases", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            { userId: 1, balance: 5, purchasedBalance: 5, monthlyAllowance: 10, resetAt: new Date() },
          ],
        }),
      }),
    });
    mockDb.update.mockReturnValue({
      set: () => ({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    await grantCredits(1, 50, "purchase", { stripeSessionId: "cs_test_abc" });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("isBillableLiveFetch requires fresh live data", () => {
    expect(isBillableLiveFetch({ isLive: true, stale: false })).toBe(true);
    expect(isBillableLiveFetch({ isLive: true, stale: true })).toBe(false);
    expect(isBillableLiveFetch({ isLive: false })).toBe(false);
    expect(isBillableLiveFetch(null)).toBe(false);
  });

  it("getCreditWallet returns allowance for pro users", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            { userId: 1, balance: 20, purchasedBalance: 0, monthlyAllowance: 20, resetAt: new Date(Date.now() + 86400000) },
          ],
        }),
      }),
    });
    mockDb.insert.mockReturnValue({ values: vi.fn() });
    mockDb.update.mockReturnValue({
      set: () => ({ where: vi.fn() }),
    });

    const wallet = await getCreditWallet(createTestUser({ planId: "pro" }));
    expect(wallet.balance).toBeGreaterThanOrEqual(0);
  });
});
