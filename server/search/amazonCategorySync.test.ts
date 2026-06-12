import { describe, expect, it } from "vitest";
import { mapAmazonCategoryToRoot } from "./amazonCategorySync";

describe("mapAmazonCategoryToRoot", () => {
  it("maps Amazon departments to internal root categories", () => {
    expect(mapAmazonCategoryToRoot("Electronics", "electronics")).toBe("electronics");
    expect(mapAmazonCategoryToRoot("Beauty & Personal Care", "beauty")).toBe("beauty");
    expect(mapAmazonCategoryToRoot("Home & Kitchen", "home-garden")).toBe("home");
    expect(mapAmazonCategoryToRoot("Sports & Outdoors", "sporting")).toBe("sports");
    expect(mapAmazonCategoryToRoot("Pet Supplies", "pets")).toBe("pet");
  });

  it("returns null for unmapped departments", () => {
    expect(mapAmazonCategoryToRoot("Gift Cards", "gift-cards")).toBeNull();
  });
});
