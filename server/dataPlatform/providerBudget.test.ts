import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  getDb: vi.fn(async () => null),
}));

vi.mock("./apiUsage", () => ({
  getDailyApiUsage: vi.fn(async () => 0),
  incrementDailyApiUsage: vi.fn(async () => 1),
}));

describe("providerBudget", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("marks Shoptera as free tier ingest-only", async () => {
    const { PROVIDER_BUDGET_RULES, getProviderTier } = await import("./providerBudget");
    expect(getProviderTier("shoptera")).toBe("free");
    expect(PROVIDER_BUDGET_RULES.shoptera?.ingestOnly).toBe(true);
    expect(PROVIDER_BUDGET_RULES.shoptera?.hourlyCap).toBeGreaterThan(0);
  });

  it("blocks Shoptera on user live search (no ingest context)", async () => {
    const { canUseProviderNow } = await import("./providerBudget");
    expect(await canUseProviderNow("shoptera")).toBe(false);
    expect(await canUseProviderNow("shoptera", { ingest: true })).toBe(true);
  });

  it("sorts free providers before paid for ingest", async () => {
    const { sortProvidersForIngest } = await import("./providerBudget");
    const sorted = sortProvidersForIngest(["amazon", "shoptera", "cj", "ebay"]);
    expect(sorted.indexOf("shoptera")).toBeLessThan(sorted.indexOf("amazon"));
    expect(sorted.indexOf("cj")).toBeLessThan(sorted.indexOf("ebay"));
  });
});
