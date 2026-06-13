import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { redeemCouponForUser } from "./coupons";
import { createTestUser } from "./testHelpers";
import * as db from "./db";

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    transaction: async (fn: (tx: typeof mockTx) => Promise<string>) => fn(mockTx),
  })),
}));

vi.mock("./stripe", () => ({
  isStripeConfigured: vi.fn(() => false),
  getStripeClient: vi.fn(),
}));

vi.mock("./planCatalog", () => ({
  getPlanCatalog: vi.fn(async () => ({})),
}));

describe("coupons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.select.mockReset();
    mockTx.insert.mockReset();
    mockTx.update.mockReset();
  });

  function mockCouponLookup(coupon: Record<string, unknown> | undefined, prior: unknown[] = []) {
    mockTx.select
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => (coupon ? [coupon] : []),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => prior,
          }),
        }),
      });
    mockTx.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    mockTx.update.mockReturnValue({
      set: () => ({ where: vi.fn().mockResolvedValue(undefined) }),
    });
  }

  it("rejects unknown coupon codes", async () => {
    mockCouponLookup(undefined);
    await expect(redeemCouponForUser(createTestUser(), "MISSING")).rejects.toThrow(TRPCError);
  });

  it("rejects already redeemed coupons", async () => {
    mockCouponLookup(
      {
        id: 1,
        code: "BONUS10",
        isActive: true,
        couponType: "bonus_searches",
        value: 10,
        maxRedemptions: -1,
        redemptionCount: 0,
        expiresAt: null,
      },
      [{ id: 99 }]
    );

    await expect(redeemCouponForUser(createTestUser(), "BONUS10")).rejects.toThrow(
      /already redeemed/
    );
  });

  it("applies bonus_searches coupon", async () => {
    mockCouponLookup({
      id: 2,
      code: "BONUS10",
      isActive: true,
      couponType: "bonus_searches",
      value: 10,
      maxRedemptions: -1,
      redemptionCount: 0,
      expiresAt: null,
    });

    const message = await redeemCouponForUser(createTestUser(), "bonus10");
    expect(message).toMatch(/Added 10 bonus searches/);
    expect(mockTx.update).toHaveBeenCalled();
  });
});
