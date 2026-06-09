import type { ProductSearchFilters, ProductSearchResult } from "@shared/searchTypes";

export type SearchPlatform = "all" | "ebay" | "amazon" | "shopify" | "tiktok";

export function applyPriceFilter(
  results: ProductSearchResult[],
  filters?: ProductSearchFilters
): ProductSearchResult[] {
  const min = filters?.priceRange?.min;
  const max = filters?.priceRange?.max;
  if (min === undefined && max === undefined) return results;

  return results.filter((item) => {
    if (min !== undefined && item.price < min) return false;
    if (max !== undefined && item.price > max) return false;
    return true;
  });
}

export function dedupeResults(results: ProductSearchResult[]): ProductSearchResult[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.platform}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortByPrice(results: ProductSearchResult[]): ProductSearchResult[] {
  return [...results].sort((a, b) => a.price - b.price);
}
