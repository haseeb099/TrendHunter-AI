import { sql } from "drizzle-orm";
import { categoryTaxonomy } from "../../drizzle/schema";
import { getDb } from "../db";
import type { CategoryTaxonomyRow, CategoryTreeNode, RegionCode } from "@shared/searchTypes";
import { inferCategoryFromTitle } from "./categories";
import { EXPANDED_TAXONOMY_SEEDS, ROOT_CATEGORY_LABELS } from "./taxonomySeeds";

const SEED_TAXONOMY = EXPANDED_TAXONOMY_SEEDS;

let cachedRows: CategoryTaxonomyRow[] | null = null;

const MIN_TAXONOMY_ROWS = 120;

/** Upsert expanded taxonomy when DB has legacy/small seed set. */
export async function ensureTaxonomySeeded(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(categoryTaxonomy);
    const count = Number(result[0]?.count ?? 0);
    if (count >= MIN_TAXONOMY_ROWS) return;

    await db.delete(categoryTaxonomy);
    const batchSize = 40;
    for (let i = 0; i < SEED_TAXONOMY.length; i += batchSize) {
      const batch = SEED_TAXONOMY.slice(i, i + batchSize);
      await db.insert(categoryTaxonomy).values(
        batch.map((row) => ({
          rootCategory: row.rootCategory,
          subcategory: row.subcategory,
          productType: row.productType,
          useCase: row.useCase,
          audience: row.audience,
          priceBand: row.priceBand,
          regionRelevance: row.regionRelevance,
        }))
      );
    }
    cachedRows = null;
  } catch {
    /* table may not exist yet */
  }
}

function seedRows(): CategoryTaxonomyRow[] {
  return SEED_TAXONOMY.map((row, index) => ({ id: index + 1, ...row }));
}

function mapDbRow(row: typeof categoryTaxonomy.$inferSelect): CategoryTaxonomyRow {
  return {
    id: row.id,
    rootCategory: row.rootCategory,
    subcategory: row.subcategory,
    productType: row.productType,
    useCase: row.useCase,
    audience: row.audience,
    priceBand: row.priceBand,
    regionRelevance: row.regionRelevance,
  };
}

async function loadRows(): Promise<CategoryTaxonomyRow[]> {
  if (cachedRows) return cachedRows;

  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(categoryTaxonomy);
      if (rows.length > 0) {
        cachedRows = rows.map(mapDbRow);
        return cachedRows;
      }
    } catch {
      /* table may not exist yet */
    }
  }

  cachedRows = seedRows();
  return cachedRows;
}

export async function getCategoryTree(region?: RegionCode): Promise<CategoryTreeNode[]> {
  await ensureTaxonomySeeded();
  const rows = await loadRows();
  const regionKey = region ?? "GLOBAL";
  const filtered = rows.filter((row) => {
    if (!row.regionRelevance) return true;
    const regions = row.regionRelevance.split(",").map((r) => r.trim().toUpperCase());
    return regions.includes(regionKey) || regions.includes("GLOBAL");
  });

  const roots = new Map<string, CategoryTreeNode>();

  for (const row of filtered) {
    const rootKey = row.rootCategory;
    if (!roots.has(rootKey)) {
      roots.set(rootKey, {
        id: row.id,
        label: ROOT_CATEGORY_LABELS[rootKey] ?? rootKey.charAt(0).toUpperCase() + rootKey.slice(1),
        value: rootKey,
        children: [],
      });
    }
    const root = roots.get(rootKey)!;

    if (!row.subcategory) continue;
    let subNode = root.children?.find((c) => c.value === row.subcategory);
    if (!subNode) {
      subNode = {
        id: row.id,
        label: row.subcategory,
        value: row.subcategory,
        children: [],
      };
      root.children!.push(subNode);
    }

    if (!row.productType) continue;
    const typeExists = subNode.children?.some((c) => c.value === row.productType);
    if (!typeExists) {
      subNode.children!.push({
        id: row.id,
        label: row.productType,
        value: row.productType,
      });
    }
  }

  return Array.from(roots.values());
}

const PLATFORM_CATEGORY_HINTS: Record<string, Record<string, string>> = {
  amazon: {
    cellphone: "electronics",
    electronics: "electronics",
    beauty: "beauty",
    kitchen: "home",
    home: "home",
    pet: "pet",
    automotive: "automotive",
  },
  ebay: {
    electronics: "electronics",
    home: "home",
    beauty: "beauty",
    pet: "pet",
    motors: "automotive",
  },
  tiktok: {
    beauty: "beauty",
    home: "home",
    electronics: "electronics",
    pet: "pet",
  },
};

export function mapMarketplaceCategory(
  raw: string | undefined,
  platform: string,
  title?: string
): {
  category?: string;
  subcategory?: string;
  productType?: string;
  taxonomyId?: number;
  categoryInferred: boolean;
} {
  const rows = cachedRows ?? seedRows();
  const haystack = `${raw ?? ""} ${title ?? ""}`.toLowerCase().trim();

  if (!haystack) {
    return { categoryInferred: true };
  }

  const hints = PLATFORM_CATEGORY_HINTS[platform] ?? {};
  for (const [hint, root] of Object.entries(hints)) {
    if (haystack.includes(hint)) {
      const rootMatch = rows.find((r) => r.rootCategory === root);
      if (rootMatch) {
        return {
          category: rootMatch.rootCategory,
          subcategory: rootMatch.subcategory ?? undefined,
          productType: rootMatch.productType ?? undefined,
          taxonomyId: rootMatch.id,
          categoryInferred: false,
        };
      }
    }
  }

  let best: CategoryTaxonomyRow | null = null;
  let bestScore = 0;

  for (const row of rows) {
    let score = 0;
    const tokens = [row.rootCategory, row.subcategory, row.productType, row.useCase].filter(
      Boolean
    ) as string[];

    for (const token of tokens) {
      if (haystack.includes(token.toLowerCase())) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  if (bestScore > 0 && best) {
    return {
      category: best.rootCategory,
      subcategory: best.subcategory ?? undefined,
      productType: best.productType ?? undefined,
      taxonomyId: best.id,
      categoryInferred: false,
    };
  }

  const inferred = inferCategoryFromTitle(title ?? raw ?? "");
  return {
    category: inferred,
    categoryInferred: !inferred,
  };
}

export { loadRows as loadCategoryTaxonomy };
