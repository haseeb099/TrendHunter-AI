import type { ProductHuntFilters, ProductSearchResult } from "@shared/searchTypes";
import { categoryMatchesFilter } from "./categories";

export function applyProductHuntFilters(
  results: ProductSearchResult[],
  filters?: ProductHuntFilters
): ProductSearchResult[] {
  if (!filters) return results;

  let filtered = [...results];

  if (filters.priceRange) {
    const { min, max } = filters.priceRange;
    filtered = filtered.filter((item) => {
      if (min !== undefined && item.price < min) return false;
      if (max !== undefined && item.price > max) return false;
      return true;
    });
  }

  if (filters.region) {
    filtered = filtered.filter(
      (item) => !item.region || item.region === filters.region || item.region === "GLOBAL"
    );
  }

  if (filters.category) {
    filtered = filtered.filter((item) =>
      categoryMatchesFilter(item.category, item.title, filters.category!)
    );
  }

  if (filters.shipFrom && filters.shipFrom.length > 0) {
    const allowed = new Set(filters.shipFrom);
    filtered = filtered.filter((item) => item.shipFrom && allowed.has(item.shipFrom));
  }

  if (filters.minRating !== undefined) {
    filtered = filtered.filter(
      (item) => item.rating === null || item.rating >= filters.minRating!
    );
  }

  if (filters.maxShippingDays !== undefined) {
    filtered = filtered.filter(
      (item) =>
        item.shippingDays === null || item.shippingDays <= filters.maxShippingDays!
    );
  }

  return sortProducts(filtered, filters.sort);
}

export function sortProducts(
  results: ProductSearchResult[],
  sort?: ProductHuntFilters["sort"]
): ProductSearchResult[] {
  const option = sort ?? "price_asc";
  const sorted = [...results];

  switch (option) {
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "trend_score":
      return sorted.sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0));
    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "price_asc":
    default:
      return sorted.sort((a, b) => a.price - b.price);
  }
}
