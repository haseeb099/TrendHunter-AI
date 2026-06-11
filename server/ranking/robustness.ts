import type { ProductSearchResult } from "@shared/searchTypes";
import { queryVariants, SYNONYM_MAP } from "../discovery/synonyms";
import { createLogger } from "../_core/logger";

const log = createLogger("ranking");

export const STABILITY_THRESHOLD = 0.6;

export function top10Ids(results: ProductSearchResult[]): Set<string> {
  return new Set(
    results
      .slice(0, 10)
      .map((r) => r.canonicalProductId ?? r.id)
  );
}

export function top10Overlap(a: ProductSearchResult[], b: ProductSearchResult[]): number {
  const setA = top10Ids(a);
  const setB = top10Ids(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = Array.from(setA).filter((id) => setB.has(id)).length;
  const union = new Set(Array.from(setA).concat(Array.from(setB))).size;
  return union === 0 ? 0 : intersection / union;
}

export function stabilizeRanks(
  variantResults: Map<string, ProductSearchResult[]>
): ProductSearchResult[] {
  const rankMap = new Map<string, number[]>();
  const productMap = new Map<string, ProductSearchResult>();

  for (const results of Array.from(variantResults.values())) {
    results.forEach((product: ProductSearchResult, index: number) => {
      const id = product.canonicalProductId ?? product.id;
      const ranks = rankMap.get(id) ?? [];
      ranks.push(index);
      rankMap.set(id, ranks);
      if (!productMap.has(id)) productMap.set(id, product);
    });
  }

  const medianRanks = Array.from(rankMap.entries()).map(([id, ranks]) => {
    const sorted = [...ranks].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1]! + sorted[mid]!) / 2
        : sorted[mid]!;
    return { id, median, product: productMap.get(id)! };
  });

  return medianRanks
    .sort((a, b) => a.median - b.median)
    .map((entry) => entry.product);
}

export function checkQueryStability(
  query: string,
  resultsByVariant: Map<string, ProductSearchResult[]>
): { stable: boolean; overlap: number; variants: string[] } {
  const variants = queryVariants(query);
  const base = resultsByVariant.get(query) ?? [];
  let minOverlap = 1;

  for (const variant of variants) {
    if (variant === query) continue;
    const other = resultsByVariant.get(variant);
    if (!other) continue;
    const overlap = top10Overlap(base, other);
    minOverlap = Math.min(minOverlap, overlap);
    if (overlap < STABILITY_THRESHOLD) {
      log.warn("ranking_inconsistency", { query, variant, overlap });
    }
  }

  return {
    stable: minOverlap >= STABILITY_THRESHOLD,
    overlap: minOverlap,
    variants,
  };
}

export { SYNONYM_MAP };
