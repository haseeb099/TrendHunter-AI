import { describe, expect, it } from "vitest";
import { getOffersForProduct, getOffersStatus } from "./suppliers";

describe("suppliers", () => {
  it("getOffersStatus reports demo mode without API keys", () => {
    const status = getOffersStatus();
    expect(status.cj.mode).toBe("demo");
    expect(status.aliexpress.mode).toBe("demo");
  });

  it("getOffersForProduct returns mock offers", async () => {
    const offers = await getOffersForProduct({ title: "Wireless Earbuds", region: "US" });
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.some((o) => o.supplierPlatform === "cj")).toBe(true);
    expect(offers.some((o) => o.supplierPlatform === "aliexpress")).toBe(true);
    expect(offers[0]?.landedCost).toBeGreaterThan(0);
  });
});
