import { describe, expect, it } from "vitest";
import {
  checkQueryStability,
  stabilizeRanks,
  top10Ids,
  top10Overlap,
} from "./robustness";
import type { ProductSearchResult } from "@shared/searchTypes";

function product(id: string): ProductSearchResult {
  return {
    id,
    title: `Product ${id}`,
    price: 20,
    platform: "ebay",
    image: null,
    shippingDays: 3,
    supplier: null,
    rating: 4,
    sourceUrl: null,
    canonicalProductId: id,
  };
}

describe("robustness", () => {
  it("computes top-10 Jaccard overlap", () => {
    const overlap = top10Overlap(
      [product("1"), product("2"), product("3")],
      [product("1"), product("2"), product("4")]
    );
    expect(overlap).toBeCloseTo(0.5, 1);
  });

  it("stabilizes ranks across query variants", () => {
    const map = new Map([
      ["earbuds", [product("a"), product("b"), product("c")]],
      ["earphones", [product("b"), product("a"), product("d")]],
    ]);
    const stable = stabilizeRanks(map);
    expect(stable[0]?.canonicalProductId).toBe("a");
  });

  it("passes stability check for identical variant results", () => {
    const results = [product("1"), product("2")];
    const map = new Map([
      ["earbuds", results],
      ["earphones", results],
    ]);
    const check = checkQueryStability("earbuds", map);
    expect(check.stable).toBe(true);
  });

  it("collects top10 ids", () => {
    const ids = top10Ids([product("1"), product("2")]);
    expect(ids.has("1")).toBe(true);
    expect(ids.has("2")).toBe(true);
  });
});
