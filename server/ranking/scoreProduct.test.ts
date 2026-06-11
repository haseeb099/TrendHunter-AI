import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import * as dbModule from "../db";
import {
  DEFAULT_WEIGHTS,
  loadActiveRankingWeights,
  scoreProduct,
} from "./scoreProduct";
import * as features from "./features";

vi.mock("../db", () => ({
  getDb: vi.fn(async () => null),
}));

vi.mock("./features", () => ({
  getProductFeatures: vi.fn(),
  materializeProductFeatures: vi.fn(async () => undefined),
}));

vi.mock("../discovery/keywordLinker", () => ({
  linkKeywordFromTitle: vi.fn(async () => "wireless earbuds"),
}));

vi.mock("../intelligence/trends", () => ({
  getTrendSignal: vi.fn(),
}));

vi.mock("../intelligence/adLibrary", () => ({
  getAdLibrarySnapshot: vi.fn(),
}));

vi.mock("../intelligence/tiktokAds", () => ({
  getTikTokAdsSnapshot: vi.fn(),
}));

function baseProduct(overrides: Partial<ProductSearchResult> = {}): ProductSearchResult {
  return {
    id: "prod-rising",
    title: "Wireless Earbuds Pro",
    price: 29.99,
    platform: "ebay",
    image: null,
    shippingDays: 5,
    supplier: "CJ",
    rating: 4.6,
    sourceUrl: "https://example.com/earbuds",
    canonicalProductId: "prod-rising",
    category: "electronics",
    listingFetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockFreshFeatures(
  canonicalProductId: string,
  region: RegionCode,
  scores: {
    momentumScore: number;
    adSaturationScore: number;
    tiktokPressureScore: number;
    supplierScore: number;
    competitionScore: number;
    freshnessScore: number;
  }
) {
  vi.mocked(features.getProductFeatures).mockResolvedValue({
    id: 1,
    canonicalProductId,
    region,
    keyword: "wireless earbuds",
    momentumScore: scores.momentumScore,
    adSaturationScore: scores.adSaturationScore,
    tiktokPressureScore: scores.tiktokPressureScore,
    supplierScore: scores.supplierScore,
    competitionScore: scores.competitionScore,
    freshnessScore: scores.freshnessScore,
    computedAt: new Date(),
    stale: false,
  });
}

function mockRankingDb(weights: Record<string, number>, region: string | null = "US") {
  vi.mocked(dbModule.getDb).mockResolvedValue({
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: async () => [
            {
              id: 1,
              version: "v2",
              region,
              isActive: true,
              weights,
              updatedAt: new Date(),
            },
          ],
        }),
      }),
    }),
  } as never);
}

describe("loadActiveRankingWeights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbModule.getDb).mockResolvedValue(null);
  });

  it("falls back to DEFAULT_WEIGHTS when database is unavailable", async () => {
    const weights = await loadActiveRankingWeights("US");
    expect(weights).toEqual({ ...DEFAULT_WEIGHTS });
  });

  it("merges stored config over defaults", async () => {
    mockRankingDb({ ...DEFAULT_WEIGHTS, trendMomentum: 0.42 });
    const weights = await loadActiveRankingWeights("US");
    expect(weights.trendMomentum).toBe(0.42);
    expect(weights.marginSpread).toBe(DEFAULT_WEIGHTS.marginSpread);
  });
});

describe("scoreProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbModule.getDb).mockResolvedValue(null);
    vi.mocked(features.getProductFeatures).mockResolvedValue(null);
  });

  it("changes fused trend score when ranking config overrides trendMomentum", async () => {
    mockFreshFeatures("prod-rising", "US", {
      momentumScore: 85,
      adSaturationScore: 80,
      tiktokPressureScore: 70,
      supplierScore: 75,
      competitionScore: 60,
      freshnessScore: 90,
    });

    const product = baseProduct();
    const withDefaults = await scoreProduct(product, "US", { query: "wireless earbuds" });

    mockRankingDb({
      ...DEFAULT_WEIGHTS,
      trendMomentum: 0.45,
      metaAdSaturation: 0.02,
      demandPersistence: 0.02,
      tiktokPressure: 0.02,
      marginSpread: 0.02,
      supplierConfidence: 0.02,
      competitionIntensity: 0.02,
      freshnessDecay: 0.02,
      queryIntentMatch: 0.02,
      returnRisk: 0.02,
    });

    const withOverride = await scoreProduct(product, "US", { query: "wireless earbuds" });

    expect(withOverride.trendScore).toBeGreaterThan(withDefaults.trendScore ?? 0);
    expect(withOverride.rankingExplanation?.topSignals[0]?.weight).toBe(0.45);
  });

  describe("golden scenarios", () => {
    it("rising trend / low ads — momentum-led opportunity", async () => {
      mockFreshFeatures("prod-rising", "US", {
        momentumScore: 88,
        adSaturationScore: 82,
        tiktokPressureScore: 74,
        supplierScore: 78,
        competitionScore: 68,
        freshnessScore: 92,
      });

      const result = await scoreProduct(baseProduct(), "US", { query: "wireless earbuds" });

      expect(result.trendScore).toMatchInlineSnapshot(`81`);
      expect(result.isTrending).toBe(true);
      expect(result.rankingExplanation?.summary).toBe(
        "Rising search interest with balanced competition signals."
      );
      expect(result.rankingExplanation?.topSignals[0]).toMatchObject({
        name: "Trend momentum",
        score: 88,
        weight: DEFAULT_WEIGHTS.trendMomentum,
      });
      expect(result.rankingExplanation?.confidence).toBe("high");
    });

    it("saturated ads / high competition — tougher window", async () => {
      mockFreshFeatures("prod-saturated", "US", {
        momentumScore: 52,
        adSaturationScore: 28,
        tiktokPressureScore: 30,
        supplierScore: 55,
        competitionScore: 30,
        freshnessScore: 70,
      });

      const result = await scoreProduct(
        baseProduct({
          id: "prod-saturated",
          canonicalProductId: "prod-saturated",
          title: "Generic Phone Case",
          price: 12.99,
          rating: 4.1,
          alsoListedOn: ["amazon", "google_shopping", "tiktok", "shoptera", "free_retail"],
        }),
        "US",
        { query: "phone case" }
      );

      expect(result.trendScore).toMatchInlineSnapshot(`51`);
      expect(result.isTrending).toBe(false);
      expect(result.rankingExplanation?.summary).toBe(
        "Moderate opportunity based on available signals."
      );
      expect(result.rankingExplanation?.topSignals[0]?.score).toBeLessThan(60);
      expect(result.rankingExplanation?.confidence).toBe("high");
    });

    it("stale features — low confidence and refresh path", async () => {
      vi.mocked(features.getProductFeatures).mockResolvedValue({
        id: 2,
        canonicalProductId: "prod-stale",
        region: "US",
        keyword: "desk lamp",
        momentumScore: 60,
        adSaturationScore: 55,
        tiktokPressureScore: 50,
        supplierScore: 58,
        competitionScore: 52,
        freshnessScore: 40,
        computedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        stale: true,
      });

      const { getTrendSignal } = await import("../intelligence/trends");
      const { getAdLibrarySnapshot } = await import("../intelligence/adLibrary");
      const { getTikTokAdsSnapshot } = await import("../intelligence/tiktokAds");

      vi.mocked(getTrendSignal).mockResolvedValue({ momentumScore: 72, keyword: "desk lamp" } as never);
      vi.mocked(getAdLibrarySnapshot).mockResolvedValue({ activeAdCount: 2 } as never);
      vi.mocked(getTikTokAdsSnapshot).mockResolvedValue({ activeAdCount: 1 } as never);

      const result = await scoreProduct(
        baseProduct({
          id: "prod-stale",
          canonicalProductId: "prod-stale",
          title: "LED Desk Lamp",
          price: 24.5,
        }),
        "US"
      );

      expect(result.rankingExplanation?.staleFeatures).toBe(true);
      expect(result.rankingExplanation?.confidence).toBe("low");
      expect(features.materializeProductFeatures).toHaveBeenCalled();
      expect(result.trendScore).toMatchInlineSnapshot(`78`);
    });
  });
});
