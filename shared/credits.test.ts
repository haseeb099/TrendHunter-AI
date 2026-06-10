import { describe, expect, it } from "vitest";
import {
  CREDIT_COSTS,
  CREDIT_PACKS,
  creditCost,
  getCreditPack,
  isUnlimitedCredits,
  PLAN_LIVE_CREDITS,
} from "./credits";

describe("creditCost", () => {
  it("returns configured costs for each action", () => {
    expect(creditCost("live_search")).toBe(CREDIT_COSTS.live_search);
    expect(creditCost("ad_library_live")).toBe(2);
    expect(creditCost("competitor_live")).toBe(3);
  });
});

describe("isUnlimitedCredits", () => {
  it("treats negative allowance as unlimited", () => {
    expect(isUnlimitedCredits(-1)).toBe(true);
    expect(isUnlimitedCredits(0)).toBe(false);
    expect(isUnlimitedCredits(100)).toBe(false);
  });
});

describe("PLAN_LIVE_CREDITS", () => {
  it("grants agency unlimited credits", () => {
    expect(PLAN_LIVE_CREDITS.agency).toBe(-1);
    expect(isUnlimitedCredits(PLAN_LIVE_CREDITS.agency)).toBe(true);
  });

  it("starter has no bundled live credits", () => {
    expect(PLAN_LIVE_CREDITS.starter).toBe(0);
  });
});

describe("CREDIT_PACKS", () => {
  it("defines three purchasable packs", () => {
    expect(Object.keys(CREDIT_PACKS)).toHaveLength(3);
    expect(getCreditPack("pack_100")?.credits).toBe(100);
  });

  it("returns null for unknown pack ids", () => {
    expect(getCreditPack("invalid")).toBeNull();
  });
});
