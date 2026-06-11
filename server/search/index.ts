import type {
  ProductHuntFilters,
  ProductSearchResponse,
  SearchProviderStatus,
  RegionCode,
} from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { isEbayConfigured } from "./ebay";
import { isSerpApiConfigured, isSerpConfigured } from "./serpapi";
import { isJustSerpConfigured } from "./justserp";
import { isTikTokConfigured } from "./tiktok";
import { isFreeRetailEnabled } from "./freeRetail";
import { isShopteraEnabled } from "./shoptera";
import { applyProductHuntFilters } from "./filters";
import { dedupeResults, type SearchPlatform } from "./utils";
import { searchCatalog } from "../dataPlatform/catalog";
import { getSearchSnapshot, saveSearchSnapshot } from "../dataPlatform/snapshots";
import { searchProductsLive } from "./liveSearch";
import { createLogger } from "../_core/logger";
import { scoreProducts } from "../ranking/scoreProduct";
import { attachRankReasons } from "../trending/rankReason";
import { searchCanonicalByKeyword } from "../dataPlatform/productGraph";
import { getAdjacentQuerySuggestions } from "../discovery/queryExpansion";
import { getProviderState } from "../_core/providerHealth";

const log = createLogger("search");

async function withScoring(
  results: ProductSearchResponse["results"],
  region: RegionCode,
  query: string
) {
  const scored = await scoreProducts(results, region, { query });
  return attachRankReasons(scored);
}

export async function getSearchProviderStatus(): Promise<SearchProviderStatus[]> {
  const providers: SearchProviderStatus[] = [
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
      note: "SerpAPI only — Just Serp has no Amazon engine",
    },
    {
      id: "google_shopping",
      label: "Google Shopping (SERP)",
      configured: isSerpConfigured(),
      platforms: ["shopify", "all"],
      tier: "paid",
      note:
        isSerpApiConfigured() && isJustSerpConfigured()
          ? "SerpAPI + Just Serp fallback"
          : isJustSerpConfigured()
            ? "Just Serp API (docs.justserpapi.com)"
            : "SerpAPI key",
    },
  ];

  return Promise.all(
    providers.map(async (p) => {
      const state = await getProviderState(p.id);
      return {
        ...p,
        degraded: state === "degraded" || state === "open",
        note:
          state === "open"
            ? `${p.note ?? ""} (circuit open — using cache)`.trim()
            : state === "degraded"
              ? `${p.note ?? ""} (degraded)`.trim()
              : p.note,
      };
    })
  );
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
    return { results: [], sources: [], isDemo: false };
  }

  const region = filters?.region ?? (ENV.defaultRegion as RegionCode);
  log.info("search_products", { query: trimmed, platform, region, live: Boolean(options?.live) });

  if (options?.live) {
    const live = await searchProductsLive(trimmed, platform, filters);
    if (live.results.length > 0) {
      const scored = await withScoring(live.results, region, trimmed);
      const response = { ...live, results: scored };
      await saveSearchSnapshot(trimmed, platform, region, response);
      return { ...response, creditsUsed: 1 };
    }

    // All live providers failed — fall back to valid then stale cache
    const validSnapshot = await getSearchSnapshot(trimmed, platform, region, false);
    if (validSnapshot && validSnapshot.response.results.length > 0) {
      const filtered = applyProductHuntFilters(
        dedupeResults(validSnapshot.response.results),
        filters
      ).slice(0, ENV.trendingMaxItems);
      log.info("live_search_cache_fallback", { query: trimmed, stale: false });
      const scored = await withScoring(filtered, region, trimmed);
      return {
        ...validSnapshot.response,
        results: scored,
        isDemo: false,
        dataMode: "cached",
        cachedAt: validSnapshot.cachedAt.toISOString(),
        stale: false,
        creditsUsed: 1,
        warnings: [
          ...(live.warnings ?? []),
          "Live providers unavailable — showing cached results.",
        ],
      };
    }

    const staleSnapshot = await getSearchSnapshot(trimmed, platform, region, true);
    if (staleSnapshot && staleSnapshot.response.results.length > 0) {
      const filtered = applyProductHuntFilters(
        dedupeResults(staleSnapshot.response.results),
        filters
      ).slice(0, ENV.trendingMaxItems);
      log.info("live_search_stale_fallback", { query: trimmed, stale: true });
      const scored = await withScoring(filtered, region, trimmed);
      return {
        ...staleSnapshot.response,
        results: scored,
        isDemo: false,
        dataMode: "cached",
        cachedAt: staleSnapshot.cachedAt.toISOString(),
        stale: true,
        creditsUsed: 1,
        warnings: [
          ...(live.warnings ?? []),
          "Live providers unavailable — showing older cached results.",
        ],
      };
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
    const scored = await withScoring(filtered, region, trimmed);
    return {
      ...snapshot.response,
      results: scored,
      isDemo: false,
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
    const scored = await withScoring(results, region, trimmed);
    return {
      results: scored,
      sources: ["free_retail"],
      isDemo: false,
      dataMode: "cached",
      cachedAt: new Date().toISOString(),
      creditsUsed: 0,
    };
  }

  const canonical = await searchCanonicalByKeyword(trimmed, region, ENV.trendingMaxItems);
  if (canonical.length > 0) {
    const scored = await withScoring(
      applyProductHuntFilters(canonical, filters).slice(0, ENV.trendingMaxItems),
      region,
      trimmed
    );
    return {
      results: scored,
      sources: ["free_retail"],
      isDemo: false,
      dataMode: "cached",
      cachedAt: new Date().toISOString(),
      warnings: ["Matched canonical product graph — run Live Search for fresh listings."],
      creditsUsed: 0,
    };
  }

  const suggestions = await getAdjacentQuerySuggestions(trimmed, region, 3);

  return {
    results: [],
    sources: [],
    isDemo: false,
    warnings: [
      "No cached results yet. Run daily ingest to populate the catalog, or use Live Search.",
    ],
    recoverySuggestions: suggestions,
    creditsUsed: 0,
  };
}
