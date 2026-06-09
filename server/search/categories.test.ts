import { describe, expect, it } from "vitest";
import { applyProductHuntFilters } from "./filters";
import { inferCategoryFromTitle, categoryMatchesFilter } from "./categories";
import type { ProductSearchResult } from "@shared/searchTypes";

describe("categories", () => {
  it("infers electronics from title keywords", () => {
    expect(inferCategoryFromTitle("Wireless Bluetooth Earbuds Pro")).toBe("electronics");
  });

  it("infers pet from title keywords", () => {
    expect(inferCategoryFromTitle("Automatic Pet Feeder")).toBe("pet");
  });

  it("categoryMatchesFilter uses inference when item has no category", () => {
    expect(categoryMatchesFilter(undefined, "Kitchen Storage Organizer", "home")).toBe(true);
    expect(categoryMatchesFilter(undefined, "Wireless Earbuds", "pet")).toBe(false);
  });

  it("applyProductHuntFilters excludes non-matching categories on live-like items", () => {
    const items: ProductSearchResult[] = [
      {
        id: "1",
        title: "Wireless Earbuds",
        price: 20,
        platform: "amazon",
        image: null,
        shippingDays: 3,
        supplier: null,
        rating: 4.5,
        sourceUrl: null,
      },
      {
        id: "2",
        title: "Pet Feeder Automatic",
        price: 30,
        platform: "ebay",
        image: null,
        shippingDays: 5,
        supplier: null,
        rating: 4.2,
        sourceUrl: null,
        category: "pet",
      },
    ];

    const filtered = applyProductHuntFilters(items, { category: "electronics" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toContain("Earbuds");
  });
});
