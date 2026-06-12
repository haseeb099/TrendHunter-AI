import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyPriceFilter, dedupeResults, sortByPrice } from "./search/utils";
import { applyProductHuntFilters } from "./search/filters";
import { normalizeProduct, inferTrendScore } from "./search/normalize";
import { getRegionMapping, resolveRegion } from "./search/regions";
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
  isSerpConfigured: vi.fn(() => false),
  searchAmazon: vi.fn(),
  searchGoogleShopping: vi.fn(),
}));

vi.mock("./search/justserp", () => ({
  isJustSerpConfigured: vi.fn(() => false),
}));

vi.mock("./search/tiktok", () => ({
  isTikTokConfigured: vi.fn(() => false),
  searchTikTok: vi.fn(),
}));

vi.mock("./dataPlatform/snapshots", () => ({
  getSearchSnapshot: vi.fn(async () => null),
  saveSearchSnapshot: vi.fn(async () => undefined),
}));

vi.mock("./dataPlatform/catalog", () => ({
  searchCatalog: vi.fn(async () => []),
}));

vi.mock("./ranking/scoreProduct", () => ({
  scoreProducts: vi.fn(async (products: ProductSearchResult[]) => products),
}));

vi.mock("./dataPlatform/productGraph", () => ({
  searchCanonicalByKeyword: vi.fn(async () => []),
  mergeSearchResults: vi.fn((results: ProductSearchResult[]) => results),
  persistListings: vi.fn(async () => undefined),
}));

vi.mock("./discovery/queryExpansion", () => ({
  getAdjacentQuerySuggestions: vi.fn(async () => []),
}));

vi.mock("./_core/providerHealth", () => ({
  getProviderState: vi.fn(async () => "healthy"),
}));

vi.mock("./_core/providerHealth", () => ({
  getProviderState: vi.fn(async () => "healthy"),
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
    const justserp = await import("./search/justserp");
    const tiktok = await import("./search/tiktok");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(false);
    vi.mocked(serpapi.isSerpApiConfigured).mockReturnValue(false);
    vi.mocked(serpapi.isSerpConfigured).mockReturnValue(false);
    vi.mocked(justserp.isJustSerpConfigured).mockReturnValue(false);
    vi.mocked(tiktok.isTikTokConfigured).mockReturnValue(false);
  });

  it(
    "returns empty results when no cache or catalog match",
    async () => {
      const { searchProducts } = await import("./search/index");
      const result = await searchProducts("wireless earbuds", "all");

      expect(result.isDemo).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.warnings?.length).toBeGreaterThan(0);
    },
    15_000
  );

  it("returns empty results for blank query", async () => {
    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("   ", "all");

    expect(result.results).toEqual([]);
    expect(result.isDemo).toBe(false);
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

  it("returns empty when live provider throws and no cache exists", async () => {
    const ebay = await import("./search/ebay");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(true);
    vi.mocked(ebay.searchEbay).mockRejectedValue(new Error("API down"));

    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("headphones", "ebay", undefined, { live: true });

    expect(result.isDemo).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("falls back to valid cache when live search returns empty", async () => {
    const ebay = await import("./search/ebay");
    const snapshots = await import("./dataPlatform/snapshots");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(true);
    vi.mocked(ebay.searchEbay).mockResolvedValue([]);

    const cachedProduct = {
      id: "cached-1",
      title: "Cached Headphones",
      price: 39.99,
      platform: "ebay",
      image: null,
      shippingDays: 5,
      supplier: "seller",
      rating: 4.2,
      sourceUrl: "https://example.com/cached",
    };

    vi.mocked(snapshots.getSearchSnapshot).mockImplementation(async (_q, _p, _r, allowStale) => {
      if (allowStale === false) {
        return {
          response: {
            results: [cachedProduct],
            sources: ["ebay"],
            isDemo: false,
            dataMode: "cached",
          },
          cachedAt: new Date("2026-06-10T12:00:00Z"),
          stale: false,
        };
      }
      return null;
    });

    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("headphones", "ebay", undefined, { live: true });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.title).toBe("Cached Headphones");
    expect(result.dataMode).toBe("cached");
    expect(result.stale).toBe(false);
    expect(result.warnings?.some((w) => w.includes("cached"))).toBe(true);
  });

  it("falls back to stale cache when live and valid cache miss", async () => {
    const ebay = await import("./search/ebay");
    const snapshots = await import("./dataPlatform/snapshots");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(true);
    vi.mocked(ebay.searchEbay).mockResolvedValue([]);

    const staleProduct = {
      id: "stale-1",
      title: "Stale Earbuds",
      price: 19.99,
      platform: "ebay",
      image: null,
      shippingDays: 7,
      supplier: "seller",
      rating: 4.0,
      sourceUrl: "https://example.com/stale",
    };

    vi.mocked(snapshots.getSearchSnapshot).mockImplementation(async (_q, _p, _r, allowStale) => {
      if (allowStale === false) return null;
      return {
        response: {
          results: [staleProduct],
          sources: ["ebay"],
          isDemo: false,
          dataMode: "cached",
        },
        cachedAt: new Date("2026-05-01T12:00:00Z"),
        stale: true,
      };
    });

    const { searchProducts } = await import("./search/index");
    const result = await searchProducts("earbuds", "ebay", undefined, { live: true });

    expect(result.results).toHaveLength(1);
    expect(result.stale).toBe(true);
    expect(result.warnings?.some((w) => w.includes("older cached"))).toBe(true);
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

  it("normalizeProduct rejects placeholder prices in strict mode", () => {
    const rejected = normalizeProduct(
      {
        id: "x",
        title: "Test",
        price: "N/A",
        platform: "ebay",
      },
      "US",
      { strictTruth: true }
    );
    expect(rejected).toBeNull();

    const zeroPrice = normalizeProduct(
      {
        id: "x",
        title: "Test",
        price: "0.00",
        platform: "ebay",
      },
      "US",
      { strictTruth: true }
    );
    expect(zeroPrice).toBeNull();
  });

  it("normalizeProduct adds currency; strict mode omits heuristic trend score", () => {
    const strict = normalizeProduct(
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
    expect(strict.currency).toBe("GBP");
    expect(strict.trendScore).toBeUndefined();
    expect(strict.categoryInferred).toBe(true);

    const heuristic = normalizeProduct(
      {
        id: "x",
        title: "Test",
        price: 10,
        platform: "ebay",
        rating: 4.8,
        shippingDays: 2,
      },
      "UK",
      { allowHeuristicScores: true }
    );
    expect(heuristic.trendScore).toBeDefined();
    expect(heuristic.trendScore!).toBeGreaterThanOrEqual(50);
    expect(heuristic.trendScoreInputs?.ratingBoost).toBeGreaterThan(0);
    expect(heuristic.trendScoreInputs?.shippingBoost).toBeGreaterThan(0);
  });

  it("inferTrendScore returns explainable inputs", () => {
    const { score, inputs } = inferTrendScore({
      title: "Test",
      price: 12,
      platform: "ebay",
      rating: 4.6,
      shippingDays: 3,
      isTrending: true,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(inputs.baseScore).toBe(50);
    expect(inputs.ratingBoost).toBe(15);
    expect(inputs.shippingBoost).toBe(10);
    expect(inputs.priceBoost).toBe(10);
    expect(inputs.trendingFlag).toBe(20);
  });

  it("resolveRegion maps UK marketplace", () => {
    const uk = getRegionMapping("UK");
    expect(uk.ebayMarketplaceId).toBe("EBAY_GB");
    expect(uk.amazonDomain).toBe("amazon.co.uk");
    expect(resolveRegion("UK").currency).toBe("GBP");
    expect(uk.cjCountryCode).toBe("UK");
    expect(uk.aliexpressShipFrom).toBe("CN");
    expect(uk.shopteraOriginCountry).toBe("GB");
  });

});

describe("getSearchProviderStatus", () => {
  beforeEach(async () => {
    vi.resetModules();
    const ebay = await import("./search/ebay");
    const serpapi = await import("./search/serpapi");
    const justserp = await import("./search/justserp");
    const tiktok = await import("./search/tiktok");
    vi.mocked(ebay.isEbayConfigured).mockReturnValue(false);
    vi.mocked(serpapi.isSerpApiConfigured).mockReturnValue(false);
    vi.mocked(serpapi.isSerpConfigured).mockReturnValue(false);
    vi.mocked(justserp.isJustSerpConfigured).mockReturnValue(false);
    vi.mocked(tiktok.isTikTokConfigured).mockReturnValue(false);
  });

  it("reports provider configuration state", async () => {
    const { getSearchProviderStatus } = await import("./search/index");
    const status = await getSearchProviderStatus();

    expect(status.find((p) => p.id === "ebay")?.configured).toBe(false);
    expect(status.find((p) => p.id === "amazon")?.configured).toBe(false);
    expect(status.find((p) => p.id === "tiktok")?.configured).toBe(false);
    expect(status.find((p) => p.id === "free_retail")?.configured).toBe(false);
    expect(status.find((p) => p.id === "cj")?.configured).toBe(false);
    expect(status.find((p) => p.id === "ropeship")?.configured).toBe(false);
    expect(status.find((p) => p.id === "mock")).toBeUndefined();
  });
});
