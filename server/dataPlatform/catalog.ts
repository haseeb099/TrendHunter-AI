import { desc, sql } from "drizzle-orm";
import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { catalogProducts } from "../../drizzle/schema";
import { getDb } from "../db";
import { searchFreeRetail } from "../search/freeRetail";
import { allowsSyntheticCatalog } from "../truthMode";

export async function upsertCatalogProducts(
  products: Array<{
    externalId: string;
    source: string;
    title: string;
    price: number;
    platform: string;
    image?: string | null;
    rating?: number | null;
    category?: string | null;
    region?: string | null;
    currency?: string;
    sourceUrl?: string | null;
    payload?: unknown;
  }>
) {
  const db = await getDb();
  if (!db || products.length === 0) return;

  const batchSize = 50;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    await db.insert(catalogProducts).values(
      batch.map((p) => ({
        externalId: p.externalId,
        source: p.source,
        title: p.title,
        price: p.price,
        platform: p.platform,
        image: p.image ?? null,
        rating: p.rating ?? null,
        category: p.category ?? null,
        region: p.region ?? null,
        currency: p.currency ?? "USD",
        sourceUrl: p.sourceUrl ?? null,
        payload: p.payload ?? null,
        fetchedAt: new Date(),
      }))
    );
  }
}

export async function searchCatalog(
  query: string,
  region?: RegionCode,
  limit = 40
): Promise<ProductSearchResult[]> {
  const db = await getDb();
  if (!db) return [];

  const q = query.trim().toLowerCase();
  if (!q) return [];

  const rows = await db
    .select()
    .from(catalogProducts)
    .orderBy(desc(catalogProducts.fetchedAt))
    .limit(800);

  const filtered = rows.filter((row) => {
    const title = row.title.toLowerCase();
    const cat = row.category?.toLowerCase() ?? "";
    return title.includes(q) || cat.includes(q);
  });

  return filtered.slice(0, limit).map((row) => ({
    id: `${row.source}-${row.externalId}`,
    title: row.title,
    price: row.price,
    platform: row.platform,
    image: row.image,
    shippingDays: null,
    supplier: row.source,
    rating: row.rating,
    sourceUrl: row.sourceUrl,
    region: (row.region as RegionCode) ?? region,
    currency: row.currency ?? "USD",
    category: row.category ?? undefined,
    sourceProvider: row.source === "free_retail" ? ("free_retail" as const) : undefined,
  }));
}

/** Seed catalog from free APIs during daily ingest (demo / non-strict-truth only). */
export async function ingestFreeCatalog(regions: RegionCode[] = ["US", "UK"]) {
  if (!(await allowsSyntheticCatalog())) {
    return 0;
  }

  const seedQueries = [
    "wireless earbuds",
    "led lights",
    "skincare",
    "pet feeder",
    "yoga mat",
    "kitchen gadget",
    "phone case",
    "beauty serum",
  ];

  let count = 0;
  for (const region of regions) {
    for (const query of seedQueries) {
      try {
        const results = await searchFreeRetail(query, region);
        await upsertCatalogProducts(
          results.map((r) => ({
            externalId: r.id,
            source: "free_retail",
            title: r.title,
            price: r.price,
            platform: r.platform,
            image: r.image,
            rating: r.rating,
            category: r.category,
            region,
            currency: r.currency,
            sourceUrl: r.sourceUrl,
          }))
        );
        count += results.length;
      } catch (err) {
        console.warn(`[Ingest] catalog seed failed for ${query}/${region}:`, err);
      }
    }
  }
  return count;
}

export async function countCatalogProducts(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(catalogProducts);
  return Number(result[0]?.count ?? 0);
}

export async function pruneOldCatalog(maxAgeDays = 90) {
  const db = await getDb();
  if (!db) return;
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  await db.delete(catalogProducts).where(sql`${catalogProducts.fetchedAt} < ${cutoff}`);
}
