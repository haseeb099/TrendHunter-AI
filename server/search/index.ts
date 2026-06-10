import type {
  ProductHuntFilters,
  ProductSearchResponse,
  SearchProviderStatus,
  RegionCode,
} from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { isEbayConfigured } from "./ebay";
import { isSerpApiConfigured } from "./serpapi";
import { isTikTokConfigured } from "./tiktok";
import { isFreeRetailEnabled } from "./freeRetail";
import { isShopteraEnabled } from "./shoptera";
import { searchMock } from "./mock";
import { applyProductHuntFilters } from "./filters";
import { dedupeResults, type SearchPlatform } from "./utils";
import { searchCatalog } from "../dataPlatform/catalog";
import { getSearchSnapshot, saveSearchSnapshot } from "../dataPlatform/snapshots";
import { searchProductsLive } from "./liveSearch";

export function getSearchProviderStatus(): SearchProviderStatus[] {
  return [
    {
      id: "free_retail",
      label: "Free retail catalogs",
      configured: isFreeRetailEnabled(),
      platforms: ["shopify", "all"],
      tier: "free",
      note: "DummyJSON + FakeStore — no key required",
    },
    {
      id: "shoptera",
      label: "Shoptera EU catalog",
      configured: isShopteraEnabled(),
      platforms: ["shopify", "all"],
      tier: "free",
      note: "300 searches/hour, no signup",
    },
    {
      id: "tiktok",
      label: "TikTok Shop",
      configured: isTikTokConfigured(),
      platforms: ["tiktok", "all"],
      tier: "paid",
      note: "JustOneAPI or official partner keys",
    },
    {
      id: "ebay",
      label: "eBay Browse API",
      configured: isEbayConfigured(),
      platforms: ["ebay", "all"],
      tier: "paid",
      note: "Free sandbox after developer approval",
    },
    {
      id: "amazon",
      label: "SerpAPI Amazon",
      configured: isSerpApiConfigured(),
      platforms: ["amazon", "all"],
      tier: "paid",
      note: "Limited free tier on serpapi.com",
    },
    {
      id: "google_shopping",
      label: "SerpAPI Google Shopping",
      configured: isSerpApiConfigured(),
      platforms: ["shopify", "all"],
      tier: "paid",
      note: "Same SerpAPI key as Amazon",
    },
    {
      id: "mock",
      label: "Demo data (fallback)",
      configured: true,
      platforms: ["all"],
      tier: "demo",
      note: "Used when no providers return results",
    },
  ];
}

export type SearchOptions = {
  live?: boolean;
};

export async function searchProducts(
  query: string,
  platform: SearchPlatform,
  filters?: ProductHuntFilters,
  options?: SearchOptions
): Promise<ProductSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], sources: [], isDemo: true, dataMode: "demo" };
  }

  const region = filters?.region ?? (ENV.defaultRegion as RegionCode);

  if (options?.live) {
    const live = await searchProductsLive(trimmed, platform, filters);
    if (!live.isDemo) {
      await saveSearchSnapshot(trimmed, platform, region, live);
    }
    return { ...live, creditsUsed: 1 };
  }

  // Cache-first path (default — no external API cost)
  const snapshot = await getSearchSnapshot(trimmed, platform, region, true);
  if (snapshot && snapshot.response.results.length > 0) {
    const filtered = applyProductHuntFilters(
      dedupeResults(snapshot.response.results),
      filters
    ).slice(0, ENV.trendingMaxItems);
    return {
      ...snapshot.response,
      results: filtered,
      dataMode: "cached",
      cachedAt: snapshot.cachedAt.toISOString(),
      stale: snapshot.stale,
      creditsUsed: 0,
    };
  }

  const catalog = await searchCatalog(trimmed, region, ENV.trendingMaxItems);
  if (catalog.length > 0) {
    const results = applyProductHuntFilters(dedupeResults(catalog), filters).slice(
      0,
      ENV.trendingMaxItems
    );
    return {
      results,
      sources: ["free_retail"],
      isDemo: false,
      dataMode: "cached",
      cachedAt: new Date().toISOString(),
      creditsUsed: 0,
    };
  }

  // Fallback demo data
  const mockResults = applyProductHuntFilters(
    searchMock(trimmed, platform, filters),
    filters
  ).slice(0, ENV.trendingMaxItems);

  return {
    results: mockResults,
    sources: ["mock"],
    isDemo: true,
    dataMode: "demo",
    warnings: [
      "Showing demo data — daily ingest will populate the catalog, or use Live Search (credits).",
    ],
    creditsUsed: 0,
  };
}
