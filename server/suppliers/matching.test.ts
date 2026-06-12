import { describe, expect, it } from "vitest";
import { computeSupplierMatch } from "./match";
import type { ProductOffer } from "@shared/searchTypes";

function mockOffer(title: string, unitCost = 10): ProductOffer {
  return {
    id: "1",
    productTitle: title,
    supplierPlatform: "cj",
    shipFrom: "US",
    unitCost,
    shippingCost: 2,
    moq: 1,
    currency: "USD",
    landedCost: unitCost + 2,
  };
}

describe("computeSupplierMatch", () => {
  it("returns none when no offers", () => {
    const result = computeSupplierMatch({ title: "Earbuds", price: 20 }, []);
    expect(result.matchState).toBe("none");
  });

  it("returns exact for high title similarity", () => {
    const result = computeSupplierMatch(
      { title: "Wireless Bluetooth Earbuds", price: 25 },
      [mockOffer("Wireless Bluetooth Earbuds TWS")]
    );
    expect(result.matchState).toBe("exact");
  });

  it("returns similar for category and price band match", () => {
    const result = computeSupplierMatch(
      { title: "LED Strip Lights", price: 15, category: "home" },
      [mockOffer("RGB home lighting kit", 12)]
    );
    expect(result.matchState).toBe("similar");
  });

  it("returns none for unrelated offers", () => {
    const result = computeSupplierMatch(
      { title: "Yoga Mat Premium", price: 45 },
      [mockOffer("Car phone mount holder", 80)]
    );
    expect(result.matchState).toBe("none");
  });
});
