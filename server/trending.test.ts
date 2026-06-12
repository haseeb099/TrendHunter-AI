import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductSearchResult } from "@shared/searchTypes";



const mockSnapshot = {

  payload: [

    {

      id: "p1",

      title: "Wireless earbuds",

      price: 29.99,

      platform: "ebay",

      image: null,

      shippingDays: 5,

      supplier: null,

      rating: 4.6,

      sourceUrl: null,

      isTrending: true,

      trendScore: 82,

    },

    {

      id: "p2",

      title: "Budget earbuds",

      price: 150,

      platform: "amazon",

      image: null,

      shippingDays: null,

      supplier: null,

      rating: null,

      sourceUrl: null,

      isTrending: true,

      trendScore: 70,

    },

  ] satisfies ProductSearchResult[],

  sources: ["ebay"],

  createdAt: new Date("2026-06-01T12:00:00Z"),

};



vi.mock("./db", () => ({
  getDb: vi.fn(async () => null),
  getValidTrendingSnapshot: vi.fn(async () => mockSnapshot),
  getStaleTrendingSnapshot: vi.fn(async () => null),
  upsertTrendingSnapshot: vi.fn(async () => undefined),
}));

vi.mock("./ranking/scoreProduct", () => ({
  scoreProducts: vi.fn(async (products: ProductSearchResult[]) => products),
  RANKING_VERSION: "v2",
}));



describe("getTrendingFeed", () => {
  beforeEach(async () => {
    const db = await import("./db");
    vi.mocked(db.getValidTrendingSnapshot).mockResolvedValue(mockSnapshot);
    vi.mocked(db.getStaleTrendingSnapshot).mockResolvedValue(null);
  });

  it(
    "returns empty results when no cached trending data",
    async () => {
      const db = await import("./db");
      vi.mocked(db.getValidTrendingSnapshot).mockResolvedValue(null);
      vi.mocked(db.getStaleTrendingSnapshot).mockResolvedValue(null);

      const { getTrendingFeed } = await import("./trending/index");
      const feed = await getTrendingFeed({ region: "US" });

      expect(feed.results).toEqual([]);
      expect(feed.isDemo).toBe(false);
      expect(feed.warnings?.length).toBeGreaterThan(0);
    },
    15_000
  );



  it("attaches rankReason to cached trending results", async () => {

    const { getTrendingFeed } = await import("./trending/index");

    const feed = await getTrendingFeed({ region: "US" });



    expect(feed.results.length).toBeGreaterThan(0);

    expect(feed.results[0]?.rankReason).toBeTruthy();

    expect(feed.results[0]?.rankReason).toMatch(/trend|ingest|score|rating/i);

  });



  it("applies price filters consistently with search", async () => {

    const { getTrendingFeed } = await import("./trending/index");

    const feed = await getTrendingFeed({

      region: "US",

      filters: { priceRange: { min: 0, max: 50 }, sort: "trend_score" },

    });



    expect(feed.results.every((r) => r.price <= 50)).toBe(true);

    expect(feed.results.some((r) => r.id === "p2")).toBe(false);

  });

});

