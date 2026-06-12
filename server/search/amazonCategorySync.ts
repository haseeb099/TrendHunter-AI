import { and, desc, eq, gt } from "drizzle-orm";
import type { RegionCode } from "@shared/searchTypes";
import { PRODUCT_CATEGORIES } from "@shared/searchTypes";
import { amazonCategoryCache, categoryTaxonomy } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { createLogger } from "../_core/logger";
import {
  fetchAmazonProductCategoryList,
  isRapidAmazonConfigured,
  type AmazonMarketplaceCategory,
} from "./rapidAmazon";

const log = createLogger("amazon-category-sync");

const CACHE_DAYS = 30;

/** Map Amazon department names to our 14 root categories. */
export function mapAmazonCategoryToRoot(name: string, id: string): string | null {
  const text = `${name} ${id}`.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/electronic|computer|software|office-product/i, "electronics"],
    [/beauty|personal care|premium beauty/i, "beauty"],
    [/home|kitchen|furniture|bedding|bath/i, "home"],
    [/sport|fitness|outdoor recreation/i, "sports"],
    [/garden|patio|lawn/i, "garden"],
    [/fashion|clothing|shoe|jewelry|watch/i, "fashion"],
    [/jewelry/i, "jewelry"],
    [/toy|game|kids|baby/i, "toys"],
    [/baby/i, "baby"],
    [/pet/i, "pet"],
    [/automotive|car |vehicle/i, "automotive"],
    [/health|household|hpc|wellness|vitamin/i, "health"],
    [/office|stationery/i, "office"],
    [/tool|industrial|hardware/i, "tools"],
    [/grocery|gourmet|food/i, "home"],
  ];

  for (const [pattern, root] of rules) {
    if (pattern.test(text) && (PRODUCT_CATEGORIES as readonly string[]).includes(root)) {
      return root;
    }
  }
  return null;
}

export async function getCachedAmazonCategories(
  region: RegionCode
): Promise<AmazonMarketplaceCategory[] | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select()
      .from(amazonCategoryCache)
      .where(
        and(eq(amazonCategoryCache.region, region), gt(amazonCategoryCache.expiresAt, new Date()))
      )
      .orderBy(desc(amazonCategoryCache.fetchedAt))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return row.categories as AmazonMarketplaceCategory[];
  } catch {
    return null;
  }
}

async function saveAmazonCategoryCache(
  region: RegionCode,
  country: string,
  categories: AmazonMarketplaceCategory[]
) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(amazonCategoryCache).values({
    region,
    country,
    categories,
    expiresAt,
  });
}

/** Enrich category_taxonomy with Amazon subcategories (budget: 1 API call per region). */
async function enrichTaxonomyFromAmazon(categories: AmazonMarketplaceCategory[]) {
  const db = await getDb();
  if (!db) return 0;

  let inserted = 0;
  for (const cat of categories.slice(0, 40)) {
    const root = mapAmazonCategoryToRoot(cat.name, cat.id);
    if (!root) continue;

    const existing = await db
      .select({ id: categoryTaxonomy.id })
      .from(categoryTaxonomy)
      .where(
        and(
          eq(categoryTaxonomy.rootCategory, root),
          eq(categoryTaxonomy.subcategory, cat.name.slice(0, 128))
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    try {
      await db.insert(categoryTaxonomy).values({
        rootCategory: root,
        subcategory: cat.name.slice(0, 128),
        productType: cat.id.slice(0, 128),
        regionRelevance: "amazon",
      });
      inserted++;
    } catch {
      /* duplicate or schema */
    }
  }
  return inserted;
}

/**
 * Sync Amazon categories for configured ingest regions (1 RapidAPI call each).
 * Respects RAPIDAPI_AMAZON_MONTHLY_CAP (default 100/month).
 */
export async function syncAmazonCategoriesFromRapidApi(
  regions: RegionCode[] = ENV.ingestRegions
): Promise<{ synced: number; enriched: number; errors: string[] }> {
  if (!isRapidAmazonConfigured()) {
    return { synced: 0, enriched: 0, errors: ["RapidAPI Amazon not configured"] };
  }

  let synced = 0;
  let enriched = 0;
  const errors: string[] = [];

  for (const region of regions) {
    const cached = await getCachedAmazonCategories(region);
    if (cached && cached.length > 0) {
      enriched += await enrichTaxonomyFromAmazon(cached);
      continue;
    }

    try {
      const categories = await fetchAmazonProductCategoryList(region);
      if (categories.length === 0) continue;

      await saveAmazonCategoryCache(region, region === "UK" ? "GB" : region === "EU" ? "DE" : "US", categories);
      enriched += await enrichTaxonomyFromAmazon(categories);
      synced++;
      log.info("amazon_categories_synced", { region, count: categories.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${region}: ${msg}`);
      log.warn("amazon_category_sync_failed", { region, error: msg });
    }
  }

  return { synced, enriched, errors };
}
