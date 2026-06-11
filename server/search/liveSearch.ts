import type { ProductHuntFilters, ProductSearchResponse, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { searchEbay, isEbayConfigured } from "./ebay";
import { searchAmazon, searchGoogleShopping, isSerpApiConfigured, isSerpConfigured } from "./serpapi";
import { searchTikTok, isTikTokConfigured } from "./tiktok";
import { searchFreeRetail, isFreeRetailEnabled } from "./freeRetail";
import { searchShoptera, isShopteraEnabled } from "./shoptera";
import { applyProductHuntFilters } from "./filters";
import { dedupeResults, type SearchPlatform } from "./utils";
import { normalizeProducts } from "./normalize";
import { mergeSearchResults, persistListings } from "../dataPlatform/productGraph";

export async function searchProductsLive(
  query: string,
  platform: SearchPlatform,
  filters?: ProductHuntFilters
): Promise<ProductSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], sources: [], isDemo: false };
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
    if (isSerpConfigured()) {
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

  results = mergeSearchResults(dedupeResults(results));
  await persistListings(results, region);
  results = applyProductHuntFilters(results, filters).slice(0, ENV.trendingMaxItems);

  if (results.length === 0) {
    warnings.push("No results from configured providers for this query.");
  }

  return {
    results,
    sources,
    isDemo: false,
    dataMode: results.length > 0 ? "live" : undefined,
    cachedAt: new Date().toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
