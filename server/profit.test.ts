import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { createTestContext } from "./testHelpers";
import * as db from "./db";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    saveProfitCalculation: vi.fn(),
    getProfitCalculations: vi.fn(),
    deleteProfitCalculation: vi.fn(),
  };
});

describe("profit router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates and saves profit metrics", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.profit.calculateProfit({
      productTitle: "Widget",
      productCost: 10,
      shippingCost: 2,
      platformFee: 1,
      adSpend: 3,
      vatDuties: 0,
      sellingPrice: 25,
      platform: "amazon",
    });

    expect(result.netProfit).toBe(9);
    expect(result.roi).toBe(90);
    expect(result.breakEvenAdSpend).toBe(12);
    expect(db.saveProfitCalculation).toHaveBeenCalled();
  });
});
