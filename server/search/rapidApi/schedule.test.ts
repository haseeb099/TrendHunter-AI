import { describe, expect, it } from "vitest";
import { computeCallsThisCycle, daysLeftInMonthUtc } from "./schedule";
import type { RapidApiRefreshPolicy } from "./refreshPolicy";

function policy(overrides: Partial<RapidApiRefreshPolicy>): RapidApiRefreshPolicy {
  return {
    id: "rapidapi_ebay_data",
    monthlyCap: 100,
    hourlyCap: 1000,
    minIntervalMs: 0,
    maxItemsPerRequest: 20,
    queryRefreshPeriod: "week",
    ingestPriority: 50,
    ...overrides,
  };
}

describe("daysLeftInMonthUtc", () => {
  it("returns days including today", () => {
    const jan15 = new Date(Date.UTC(2026, 0, 15));
    expect(daysLeftInMonthUtc(jan15)).toBe(17);
  });
});

describe("computeCallsThisCycle", () => {
  it("spreads monthly remainder across days left", () => {
    const calls = computeCallsThisCycle(
      policy({ monthlyCap: 100 }),
      { monthlyUsed: 70, dailyUsed: 0, hourlyUsed: 0 },
      10
    );
    expect(calls).toBe(3);
  });

  it("respects daily cap", () => {
    const calls = computeCallsThisCycle(
      policy({ monthlyCap: 600, dailyCap: 20 }),
      { monthlyUsed: 0, dailyUsed: 18, hourlyUsed: 0 },
      30
    );
    expect(calls).toBe(2);
  });

  it("respects hourly cap", () => {
    const calls = computeCallsThisCycle(
      policy({ monthlyCap: 1000, hourlyCap: 1000 }),
      { monthlyUsed: 0, dailyUsed: 0, hourlyUsed: 998 },
      30
    );
    expect(calls).toBe(2);
  });

  it("returns zero when monthly exhausted", () => {
    const calls = computeCallsThisCycle(
      policy({ monthlyCap: 100 }),
      { monthlyUsed: 100, dailyUsed: 0, hourlyUsed: 0 },
      15
    );
    expect(calls).toBe(0);
  });
});
