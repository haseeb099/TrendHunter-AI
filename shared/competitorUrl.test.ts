import { describe, expect, it } from "vitest";
import { extractCompetitorSearchQuery, resolveCompetitorSearchInput } from "./competitorUrl";

describe("extractCompetitorSearchQuery", () => {
  it("extracts Amazon product title from path", () => {
    expect(
      extractCompetitorSearchQuery(
        "https://www.amazon.com/Echo-Dot-5th-Gen/dp/B09B8V1LZ3"
      )
    ).toEqual({
      query: "Echo Dot 5th Gen",
      platform: "amazon",
      host: "amazon.com",
    });
  });

  it("extracts Amazon search query param", () => {
    expect(
      extractCompetitorSearchQuery("https://www.amazon.com/s?k=wireless+earbuds")
    ).toEqual({
      query: "wireless earbuds",
      platform: "amazon",
      host: "amazon.com",
    });
  });

  it("extracts eBay search query param", () => {
    expect(
      extractCompetitorSearchQuery("https://www.ebay.com/sch/i.html?_nkw=portable+blender")
    ).toEqual({
      query: "portable blender",
      platform: "ebay",
      host: "ebay.com",
    });
  });

  it("extracts Shopify product handle", () => {
    expect(
      extractCompetitorSearchQuery("https://example.myshopify.com/products/led-desk-lamp-pro")
    ).toEqual({
      query: "led desk lamp pro",
      platform: "shopify",
      host: "example.myshopify.com",
    });
  });
});

describe("resolveCompetitorSearchInput", () => {
  it("prefers explicit keyword over URL", () => {
    expect(
      resolveCompetitorSearchInput({
        keyword: "yoga mat",
        url: "https://www.amazon.com/s?k=wireless+earbuds",
      })
    ).toEqual({
      query: "yoga mat",
      sourceUrl: "https://www.amazon.com/s?k=wireless+earbuds",
    });
  });

  it("falls back to URL extraction", () => {
    expect(
      resolveCompetitorSearchInput({
        url: "https://www.amazon.com/s?k=pet+grooming",
      })
    ).toEqual({
      query: "pet grooming",
      platform: "amazon",
      sourceUrl: "https://www.amazon.com/s?k=pet+grooming",
    });
  });
});
