import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyPriceFilter, dedupeResults, sortByPrice } from "./search/utils";
import { applyProductHuntFilters } from "./search/filters";
import { normalizeProduct } from "./search/normalize";
import { getRegionMapping, resolveRegion } from "./search/regions";
import { searchMock } from "./search/mock";
import type { ProductSearchResult } from "@shared/searchTypes";

const sampleResults: ProductSearchResult[] = [
  {
    id: "1",
    title: "Product A",
    price: 50,
    platform: "ebay",
    image: null,
    shippingDays: 3,
    supplier: "Seller A",
    rating: 4.5,
    sourceUrl: "https://example.com/a",
  },
  {
    id: "2",
    title: "Product B",
    price: 20,
    platform: "amazon",
    image: null,
    shippingDays: null,
    supplier: "Amazon",
    rating: 4.0,
    sourceUrl: "https://example.com/b",
  },
  {
    id: "1",
    title: "Duplicate A",
    price: 50,
    platform: "ebay",
    image: null,
    shippingDays: 3,
    supplier: "Seller A",
    rating: 4.5,
    sourceUrl: "https://example.com/a-dup",
  },
];

vi.mock("./search/ebay", () => ({
  isEbayConfigured: vi.fn(() => false),
  searchEbay: vi.fn(),
}));

vi.mock("./search/serpapi", () => ({
  isSerpApiConfigured: vi.fn(() => false),
  searchAmazon: vi.fn(),
  searchGoogleShopping: vi.fn(),
}));

vi.mock("./search/tiktok", () => ({
  isTikTokConfigured: vi.fn(() => false),
  searchTikTok: vi.fn(),
}));

describe("search utils", () => {
  it("filters by price range", () => {
    const filtered = applyPriceFilter(sampleResults, {
      priceRange: { min: 25, max: 60 },
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.price >= 25 && item.price <= 60)).toBe(true);
  });

  it("deduplicates by platform and id", () => {
    expect(dedupeResults(sampleResults)).toHaveLength(2);
  });

  it("sorts by ascending price", () => {
    const sorted = sortByPrice(sampleResults);
    expect(sorted[0]?.price).toBeLessThanOrEqual(sorted[1]?.price ?? Infinity);
  });
});

describe("searchProducts orchestrator", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const ebay = await import("./search/ebay");
    const serpapi = await import("./search/serpapi");
    const tiktok = await import("./search/tiktok");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(false);
    vi.mocked(serpapi.isSerpApiConfigured).mockReturnValue(false);
    vi.mocked(tiktok.isTikTokConfigured).mockReturnValue(false);
  });

  it("returns demo data when no live providers are configured", async () => {
    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("wireless earbuds", "all");

    expect(result.isDemo).toBe(true);
    expect(result.sources).toEqual(["mock"]);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]?.title.toLowerCase()).toContain("wireless earbuds");
  });

  it("returns empty results for blank query", async () => {
    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("   ", "all");

    expect(result.results).toEqual([]);
    expect(result.isDemo).toBe(true);
  });

  it("uses eBay when configured", async () => {
    const ebay = await import("./search/ebay");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(true);
    vi.mocked(ebay.searchEbay).mockResolvedValue([
      {
        id: "ebay-1",
        title: "Live eBay Item",
        price: 29.99,
        platform: "ebay",
        image: null,
        shippingDays: 4,
        supplier: "ebay_seller",
        rating: null,
        sourceUrl: "https://ebay.com/item/1",
      },
    ]);

    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("charger", "ebay", undefined, { live: true });

    expect(result.isDemo).toBe(false);
    expect(result.sources).toEqual(["ebay"]);
    expect(result.results[0]?.platform).toBe("ebay");
  });

  it("falls back to mock when live provider throws", async () => {
    const ebay = await import("./search/ebay");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(true);
    vi.mocked(ebay.searchEbay).mockRejectedValue(new Error("API down"));

    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("headphones", "ebay", undefined, { live: true });

    expect(result.isDemo).toBe(true);
    expect(result.sources).toEqual(["mock"]);
  });

  it("uses TikTok when configured", async () => {
    const tiktok = await import("./search/tiktok");
    vi.mocked(tiktok.isTikTokConfigured).mockReturnValue(true);
    vi.mocked(tiktok.searchTikTok).mockResolvedValue([
      {
        id: "tt-1",
        title: "Viral TikTok Product",
        price: 14.99,
        platform: "tiktok",
        image: null,
        shippingDays: null,
        supplier: "TikTok Shop",
        rating: 4.8,
        sourceUrl: "https://tiktok.com/shop/pdp/1",
      },
    ]);

    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("makeup", "tiktok", undefined, { live: true });

    expect(result.isDemo).toBe(false);
    expect(result.sources).toEqual(["tiktok"]);
    expect(result.results[0]?.platform).toBe("tiktok");
  });
});

describe("filters and normalize", () => {
  it("applyProductHuntFilters filters by rating and shipping", () => {
    const items: ProductSearchResult[] = [
      { ...sampleResults[0], rating: 3, shippingDays: 10 },
      { ...sampleResults[1], rating: 4.5, shippingDays: 3 },
    ];
    const filtered = applyProductHuntFilters(items, {
      minRating: 4,
      maxShippingDays: 5,
      sort: "rating",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.rating).toBe(4.5);
  });

  it("normalizeProduct adds currency and trend score", () => {
    const normalized = normalizeProduct(
      {
        id: "x",
        title: "Test",
        price: 10,
        platform: "ebay",
        rating: 4.8,
        shippingDays: 2,
      },
      "UK"
    );
    expect(normalized.currency).toBe("GBP");
    expect(normalized.trendScore).toBeGreaterThan(50);
  });

  it("resolveRegion maps UK marketplace", () => {
    const uk = getRegionMapping("UK");
    expect(uk.ebayMarketplaceId).toBe("EBAY_GB");
    expect(uk.amazonDomain).toBe("amazon.co.uk");
    expect(resolveRegion("UK").currency).toBe("GBP");
  });

  it("searchMock returns region-aware demo catalog", () => {
    const us = searchMock("gadget", "all", { region: "US" });
    const uk = searchMock("gadget", "all", { region: "UK" });
    expect(us.length).toBeGreaterThanOrEqual(15);
    expect(uk[0]?.currency).toBe("GBP");
  });
});

describe("getSearchProviderStatus", () => {
  beforeEach(async () => {
    vi.resetModules();
    const ebay = await import("./search/ebay");
    const serpapi = await import("./search/serpapi");
    const tiktok = await import("./search/tiktok");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(false);
    vi.mocked(serpapi.isSerpApiConfigured).mockReturnValue(false);
    vi.mocked(tiktok.isTikTokConfigured).mockReturnValue(false);
  });

  it("reports provider configuration state", async () => {
    const { getSearchProviderStatus } = await import("./search/index");
    const status = getSearchProviderStatus();

    expect(status.find((p) => p.id === "ebay")?.configured).toBe(false);
    expect(status.find((p) => p.id === "amazon")?.configured).toBe(false);
    expect(status.find((p) => p.id === "tiktok")?.configured).toBe(false);
    expect(status.find((p) => p.id === "free_retail")?.configured).toBe(true);
    expect(status.find((p) => p.id === "mock")?.configured).toBe(true);
  });
});
