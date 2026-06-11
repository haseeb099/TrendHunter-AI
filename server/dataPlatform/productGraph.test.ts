import { describe, expect, it } from "vitest";
import {
  inferPriceBand,
  jaccardSimilarity,
  mergeSearchResults,
  normalizeTitle,
  pricesWithinTolerance,
  tokenizeTitle,
} from "./productGraph";
import type { ProductSearchResult } from "@shared/searchTypes";

function makeProduct(
  overrides: Partial<ProductSearchResult> & { id: string; title: string; platform: string }
): ProductSearchResult {
  return {
    price: 29.99,
    image: null,
    shippingDays: 5,
    supplier: "seller",
    rating: 4.5,
    sourceUrl: "https://example.com",
    ...overrides,
  };
}

describe("productGraph", () => {
  it("normalizes promo text and emoji from titles", () => {
    expect(normalizeTitle("[PROMO] Free Shipping 🔥 Wireless Earbuds!!")).toContain(
      "wireless earbuds"
    );
  });

  it("computes Jaccard similarity between token sets", () => {
    const a = tokenizeTitle("wireless bluetooth earbuds");
    const b = tokenizeTitle("bluetooth wireless earphones");
    expect(jaccardSimilarity(a, b)).toBeGreaterThanOrEqual(0.4);
  });

  it("merges same earbuds on eBay and Amazon into one canonical", () => {
    const products = [
      makeProduct({
        id: "ebay-1",
        title: "Wireless Bluetooth Earbuds with Charging Case",
        platform: "ebay",
        price: 24.99,
        category: "electronics",
      }),
      makeProduct({
        id: "amz-1",
        title: "Bluetooth Wireless Earbuds Charging Case",
        platform: "amazon",
        price: 26.99,
        category: "electronics",
      }),
    ];

    const merged = mergeSearchResults(products);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.canonicalProductId).toBeDefined();
    expect(merged[0]?.alsoListedOn?.length).toBe(1);
    expect(merged[0]?.sourceProvider).toBeDefined();
    expect(merged[0]?.listingFetchedAt).toBeDefined();
  });

  it("does not merge unrelated products", () => {
    const products = [
      makeProduct({
        id: "1",
        title: "Silicone Phone Case Black iPhone 15",
        platform: "ebay",
        price: 12.99,
        category: "electronics",
      }),
      makeProduct({
        id: "2",
        title: "Leather Wallet Brown Genuine",
        platform: "amazon",
        price: 35.0,
        category: "fashion",
      }),
    ];

    const merged = mergeSearchResults(products);
    expect(merged).toHaveLength(2);
  });

  it("does not merge across price bands", () => {
    expect(pricesWithinTolerance(10, 50)).toBe(false);
    expect(inferPriceBand(8)).toBe("budget");
    expect(inferPriceBand(80)).toBe("premium");
  });

  it("attaches provenance fields on every merged result", () => {
    const products = [
      makeProduct({ id: "1", title: "LED Strip Lights 5m", platform: "ebay", price: 15 }),
    ];
    const merged = mergeSearchResults(products);
    expect(merged[0]?.sourceProvider).toBe("ebay");
    expect(merged[0]?.listingFetchedAt).toBeTruthy();
  });
});
