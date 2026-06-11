import { describe, expect, it } from "vitest";
import { computeQueryPriority } from "./queryExpansion";

describe("queryExpansion", () => {
  it("orders higher priority for stronger trend momentum", () => {
    const high = computeQueryPriority({ trendMomentum: 90 });
    const low = computeQueryPriority({ trendMomentum: 20 });
    expect(high).toBeGreaterThan(low);
  });

  it("respects priority formula weights", () => {
    const score = computeQueryPriority({
      trendMomentum: 80,
      adVelocity: 60,
      userDemand: 5,
      watchlistAffinity: 0.5,
      categoryBoost: 0.4,
    });
    expect(score).toBeGreaterThan(0.4);
    expect(score).toBeLessThanOrEqual(1);
  });
});
