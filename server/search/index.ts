import type {
  ProductHuntFilters,
  ProductSearchResponse,
  SearchProviderStatus,
  RegionCode,
} from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { searchEbay, isEbayConfigured } from "./ebay";
import { searchAmazon, searchGoogleShopping, isSerpApiConfigured } from "./serpapi";
import { searchTikTok, isTikTokConfigured } from "./tiktok";
import { searchFreeRetail, isFreeRetailEnabled } from "./freeRetail";
import { searchShoptera, isShopteraEnabled } from "./shoptera";
import { searchMock } from "./mock";
import { applyProductHuntFilters } from "./filters";
import { dedupeResults, type SearchPlatform } from "./utils";
import { normalizeProducts } from "./normalize";

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

function getExpectedProviders(platform: SearchPlatform): SearchProviderStatus["id"][] {
  const expected: SearchProviderStatus["id"][] = [];
  if (platform === "all" || platform === "ebay") {
    if (isEbayConfigured()) expected.push("ebay");
  }
  if (platform === "all" || platform === "amazon") {
    if (isSerpApiConfigured()) expected.push("amazon");
  }
  if (platform === "all" || platform === "shopify") {
    if (isSerpApiConfigured()) expected.push("google_shopping");
    if (isFreeRetailEnabled()) expected.push("free_retail");
    if (isShopteraEnabled()) expected.push("shoptera");
  }
  if (platform === "all") {
    if (isFreeRetailEnabled()) expected.push("free_retail");
    if (isShopteraEnabled()) expected.push("shoptera");
  }
  if (platform === "all" || platform === "tiktok") {
    if (isTikTokConfigured()) expected.push("tiktok");
  }
  return expected;
}

export async function searchProducts(
  query: string,
  platform: SearchPlatform,
  filters?: ProductHuntFilters
): Promise<ProductSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], sources: [], isDemo: true };
  }

  const region = filters?.region ?? (ENV.defaultRegion as RegionCode);
  const tasks: Array<{
    source: ProductSearchResponse["sources"][number];
    label: string;
    run: () => Promise<unknown[]>;
  }> = [];

  if (platform === "all" || platform === "ebay") {
    if (isEbayConfigured()) {
      tasks.push({ source: "ebay", label: "eBay", run: () => searchEbay(trimmed, region) });
    }
  }

  if (platform === "all" || platform === "amazon") {
    if (isSerpApiConfigured()) {
      tasks.push({ source: "amazon", label: "Amazon", run: () => searchAmazon(trimmed, region) });
    }
  }

  if (platform === "all" || platform === "shopify") {
    if (isSerpApiConfigured()) {
      tasks.push({
        source: "google_shopping",
        label: "Google Shopping",
        run: () => searchGoogleShopping(trimmed, region),
      });
    }
    if (isFreeRetailEnabled()) {
      tasks.push({
        source: "free_retail",
        label: "Free retail",
        run: () => searchFreeRetail(trimmed, region),
      });
    }
    if (isShopteraEnabled()) {
      tasks.push({
        source: "shoptera",
        label: "Shoptera",
        run: () => searchShoptera(trimmed, region),
      });
    }
  }

  if (platform === "all") {
    if (isFreeRetailEnabled() && !tasks.some((t) => t.source === "free_retail")) {
      tasks.push({
        source: "free_retail",
        label: "Free retail",
        run: () => searchFreeRetail(trimmed, region),
      });
    }
    if (isShopteraEnabled() && !tasks.some((t) => t.source === "shoptera")) {
      tasks.push({
        source: "shoptera",
        label: "Shoptera",
        run: () => searchShoptera(trimmed, region),
      });
    }
  }

  if (platform === "all" || platform === "tiktok") {
    if (isTikTokConfigured()) {
      tasks.push({ source: "tiktok", label: "TikTok", run: () => searchTikTok(trimmed, region) });
    }
  }

  const settled = await Promise.allSettled(tasks.map((task) => task.run()));
  const sources: ProductSearchResponse["sources"] = [];
  const warnings: string[] = [];
  let results: ProductSearchResponse["results"] = [];

  settled.forEach((outcome, index) => {
    const task = tasks[index];
    if (!task) return;

    if (outcome.status === "fulfilled") {
      const normalized = normalizeProducts(
        outcome.value as Parameters<typeof normalizeProducts>[0],
        region
      );
      if (normalized.length > 0) {
        sources.push(task.source);
        results = results.concat(normalized);
      }
    } else {
      console.error(`[Search] ${task.source} provider failed:`, outcome.reason);
      warnings.push(`${task.label} search failed — showing results from other providers`);
    }
  });

  const expected = getExpectedProviders(platform);
  for (const providerId of expected) {
    if (!sources.includes(providerId)) {
      const label = getSearchProviderStatus().find((p) => p.id === providerId)?.label ?? providerId;
      if (!warnings.some((w) => w.includes(label))) {
        warnings.push(`${label} unavailable — partial results shown`);
      }
    }
  }

  const hasLiveData = sources.length > 0;
  const onlyFreeSources = sources.every((s) => s === "free_retail" || s === "shoptera" || s === "tiktok");

  if (!hasLiveData) {
    sources.push("mock");
    results = searchMock(trimmed, platform, filters);
  }

  results = applyProductHuntFilters(dedupeResults(results), filters).slice(
    0,
    ENV.trendingMaxItems
  );

  return {
    results,
    sources,
    isDemo: !hasLiveData,
    warnings:
      onlyFreeSources && !isSerpApiConfigured() && !isEbayConfigured()
        ? [
            ...(warnings ?? []),
            "Using free catalog sources — add eBay or SerpAPI when approved for Amazon/eBay live data",
          ]
        : warnings.length > 0
          ? warnings
          : undefined,
  };
}
