import { randomUUID } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { canonicalProducts, productListings } from "../../drizzle/schema";
import type {
  ProductSearchResult,
  RegionCode,
  SearchProviderId,
} from "@shared/searchTypes";
import { getDb } from "../db";
import { inferCategoryFromTitle } from "../search/categories";

const STOPWORDS = new Set([
  "with", "for", "the", "a", "an", "and", "or", "in", "on", "of", "to", "by",
]);

const JACCARD_THRESHOLD = 0.72;
const PRICE_TOLERANCE = 0.35;

export type PriceBand = "budget" | "mid" | "premium";

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[promo\]/gi, "")
    .replace(/free shipping/gi, "")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(title: string): Set<string> {
  return tokenizeTitle(title);
}

export function tokenizeTitle(title: string): Set<string> {
  const normalized = normalizeTitle(title);
  return new Set(
    normalized
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
  );
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = Array.from(a).filter((x) => b.has(x)).length;
  const union = new Set(Array.from(a).concat(Array.from(b))).size;
  return union === 0 ? 0 : intersection / union;
}

export function inferPriceBand(price: number): PriceBand {
  if (price < 15) return "budget";
  if (price <= 60) return "mid";
  return "premium";
}

export function pricesWithinTolerance(a: number, b: number, tolerance = PRICE_TOLERANCE): boolean {
  if (a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / Math.max(a, b) <= tolerance;
}

/** @alias pricesWithinTolerance */
export const priceWithinBand = pricesWithinTolerance;

type CanonicalCandidate = {
  id: string;
  tokens: Set<string>;
  category?: string;
  price: number;
  priceBand: PriceBand;
  platforms: Set<string>;
};

function findBestCandidate(
  product: ProductSearchResult,
  candidates: CanonicalCandidate[]
): CanonicalCandidate | null {
  const tokens = tokenizeTitle(product.title);
  const category = product.category ?? inferCategoryFromTitle(product.title);
  const priceBand = inferPriceBand(product.price);

  let best: CanonicalCandidate | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    if (category && candidate.category && category !== candidate.category) continue;
    if (candidate.priceBand !== priceBand) continue;
    if (!pricesWithinTolerance(product.price, candidate.price)) continue;

    const score = jaccardSimilarity(tokens, candidate.tokens);
    if (score >= JACCARD_THRESHOLD && score > bestScore) {
      bestScore = score;
      best = candidate;
    } else if (score >= JACCARD_THRESHOLD && score === bestScore) {
      return null;
    }
  }

  return best;
}

/** In-memory canonical merge — conservative Jaccard + category + price band guards. */
export function mergeListingsInMemory(
  results: ProductSearchResult[],
  _region?: RegionCode
): ProductSearchResult[] {
  return mergeSearchResults(results);
}

export function mergeSearchResults(results: ProductSearchResult[]): ProductSearchResult[] {
  const candidates: CanonicalCandidate[] = [];
  const merged: ProductSearchResult[] = [];

  for (const product of results) {
    const match = findBestCandidate(product, candidates);

    if (match) {
      match.platforms.add(product.platform);
      match.price = (match.price + product.price) / 2;
      const existing = merged.find((m) => m.canonicalProductId === match!.id);
      if (existing) {
        const platforms = new Set((existing.alsoListedOn ?? []).concat(product.platform));
        existing.alsoListedOn = Array.from(platforms).filter((p) => p !== existing.platform);
        if ((product.trendScore ?? 0) > (existing.trendScore ?? 0)) {
          Object.assign(existing, {
            ...product,
            canonicalProductId: match.id,
            alsoListedOn: existing.alsoListedOn,
          });
        }
      } else {
        merged.push({
          ...product,
          canonicalProductId: match.id,
          sourceProvider: product.sourceProvider ?? (product.platform as SearchProviderId),
          listingFetchedAt: product.listingFetchedAt ?? new Date().toISOString(),
          alsoListedOn: Array.from(match.platforms).filter((p) => p !== product.platform),
          rankingVersion: product.rankingVersion ?? "v2",
        });
      }
    } else {
      const id = product.canonicalProductId ?? randomUUID();
      const tokens = tokenizeTitle(product.title);
      candidates.push({
        id,
        tokens,
        category: product.category ?? inferCategoryFromTitle(product.title),
        price: product.price,
        priceBand: inferPriceBand(product.price),
        platforms: new Set([product.platform]),
      });
      merged.push({
        ...product,
        canonicalProductId: id,
        sourceProvider: product.sourceProvider ?? (product.platform as SearchProviderId),
        listingFetchedAt: product.listingFetchedAt ?? new Date().toISOString(),
        rankingVersion: product.rankingVersion ?? "v2",
      });
    }
  }

  return merged;
}

export async function persistListings(
  results: ProductSearchResult[],
  region: RegionCode
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const merged = mergeSearchResults(results);

  for (const product of merged) {
    const canonicalId = product.canonicalProductId ?? randomUUID();
    const normalized = normalizeTitle(product.title);
    const category = product.category ?? inferCategoryFromTitle(product.title);
    const band = inferPriceBand(product.price);

    const existing = await db
      .select()
      .from(canonicalProducts)
      .where(eq(canonicalProducts.id, canonicalId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(canonicalProducts).values({
        id: canonicalId,
        normalizedTitle: normalized,
        category: category ?? null,
        priceBand: band,
        primaryImageUrl: product.image,
        listingCount: 1,
      });
    } else {
      await db
        .update(canonicalProducts)
        .set({
          lastSeenAt: new Date(),
          listingCount: (existing[0]?.listingCount ?? 1) + 1,
          primaryImageUrl: product.image ?? existing[0]?.primaryImageUrl,
        })
        .where(eq(canonicalProducts.id, canonicalId));
    }

    const listingId = `${canonicalId}:${product.platform}:${product.id}`.slice(0, 36);
    await db.insert(productListings).values({
      id: listingId,
      canonicalProductId: canonicalId,
      platform: product.platform,
      externalId: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency ?? "USD",
      region,
      sourceProvider: product.sourceProvider ?? product.platform,
      sourceUrl: product.sourceUrl,
      fetchedAt: new Date(),
      payload: product,
    });
  }
}

export async function searchCanonicalByKeyword(
  query: string,
  region: RegionCode,
  limit = 20
): Promise<ProductSearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  const normalized = normalizeTitle(query);
  const rows = await db
    .select()
    .from(canonicalProducts)
    .where(
      and(
        gte(canonicalProducts.normalizedTitle, normalized),
        lte(canonicalProducts.normalizedTitle, `${normalized}\uffff`)
      )
    )
    .limit(limit);

  const results: ProductSearchResult[] = [];
  for (const row of rows) {
    if (!row.normalizedTitle.includes(normalized.split(" ")[0] ?? "")) continue;
    const listings = await db
      .select()
      .from(productListings)
      .where(
        and(
          eq(productListings.canonicalProductId, row.id),
          eq(productListings.region, region)
        )
      )
      .limit(1);

    const listing = listings[0];
    if (!listing) continue;

    results.push({
      id: listing.externalId,
      title: listing.title,
      price: listing.price,
      platform: listing.platform,
      image: row.primaryImageUrl,
      shippingDays: null,
      supplier: null,
      rating: null,
      sourceUrl: listing.sourceUrl,
      region,
      currency: listing.currency ?? "USD",
      category: row.category ?? undefined,
      canonicalProductId: row.id,
      sourceProvider: listing.sourceProvider as SearchProviderId,
      listingFetchedAt: listing.fetchedAt.toISOString(),
      rankingVersion: "v2",
    });
  }

  return results;
}

export function attachProvenance(
  results: ProductSearchResult[],
  sourceProvider?: SearchProviderId
): ProductSearchResult[] {
  const now = new Date().toISOString();
  return results.map((r) => ({
    ...r,
    sourceProvider: r.sourceProvider ?? sourceProvider ?? (r.platform as SearchProviderId),
    listingFetchedAt: r.listingFetchedAt ?? now,
    rankingVersion: r.rankingVersion ?? "v2",
  }));
}
