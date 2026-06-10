import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { createTestContext, createTestUser } from "./testHelpers";
import * as db from "./db";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getWatchlist: vi.fn(),
    getPipelineItems: vi.fn(),
    getProfitCalculations: vi.fn(),
    countUserEvents: vi.fn(),
  };
});

describe("analytics router", () => {
  it("aggregates dashboard metrics from user data", async () => {
    vi.mocked(db.getWatchlist).mockResolvedValue([{ id: 1 } as any, { id: 2 } as any]);
    vi.mocked(db.getPipelineItems).mockResolvedValue([
      { stage: "testing" } as any,
      { stage: "scaling" } as any,
      { stage: "paused" } as any,
    ]);
    vi.mocked(db.countUserEvents).mockResolvedValue(3);
    vi.mocked(db.getProfitCalculations).mockResolvedValue([
      {
        productTitle: "Earbuds",
        sellingPrice: 100,
        netProfit: 40,
        roi: 50,
      } as any,
      {
        productTitle: "Case",
        sellingPrice: 50,
        netProfit: 20,
        roi: 30,
      } as any,
    ]);

    const caller = appRouter.createCaller(createTestContext());
    const metrics = await caller.analytics.getDashboardMetrics();

    expect(metrics.totalWatchlistItems).toBe(2);
    expect(metrics.pipelineByStage.testing).toBe(1);
    expect(metrics.pipelineByStage.scaling).toBe(1);
    expect(metrics.totalRevenue).toBe(150);
    expect(metrics.totalProfit).toBe(60);
    expect(metrics.hasAdvancedAnalytics).toBe(false);
    expect(metrics.discoverViews).toBe(0);
    expect(metrics.trendData).toEqual([]);
    expect(metrics.profitByProduct).toEqual([]);
  });

  it("includes advanced analytics for business plans", async () => {
    vi.mocked(db.getWatchlist).mockResolvedValue([]);
    vi.mocked(db.getPipelineItems).mockResolvedValue([{ stage: "testing", sourceUrl: "x" } as any]);
    vi.mocked(db.countUserEvents).mockResolvedValue(5);
    vi.mocked(db.getProfitCalculations).mockResolvedValue([
      {
        productTitle: "Earbuds",
        sellingPrice: 100,
        netProfit: 40,
        roi: 50,
        createdAt: new Date(),
      } as any,
    ]);

    const caller = appRouter.createCaller(createTestContext(createTestUser({ planId: "business" })));
    const metrics = await caller.analytics.getDashboardMetrics();

    expect(metrics.hasAdvancedAnalytics).toBe(true);
    expect(metrics.discoverViews).toBe(5);
    expect(metrics.trendData.length).toBe(6);
    expect(metrics.profitByProduct.length).toBeGreaterThan(0);
  });
});
