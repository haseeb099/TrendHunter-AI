import { and, inArray, lt, sql } from "drizzle-orm";
import {
  adLibrarySnapshots,
  aiOutputCache,
  apiUsageDaily,
  catalogProducts,
  discoveryQueue,
  ingestRuns,
  productFeatures,
  productListings,
  productOffers,
  searchSnapshots,
  tiktokAdsSnapshots,
  trendSignals,
  trendingSnapshotDiffs,
  trendingSnapshots,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import { createLogger } from "../_core/logger";

const log = createLogger("dataRetention");

export type RetentionReport = Record<string, number>;

/**
 * Remove platform cache rows older than DATA_RETENTION_DAYS (default 90 ≈ 3 months).
 * User/workspace data (watchlist, pipeline, users) is never touched.
 */
export async function pruneStalePlatformData(
  retentionDays = ENV.dataRetentionDays
): Promise<RetentionReport> {
  const db = await getDb();
  const report: RetentionReport = {};
  if (!db) return report;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const tables: Array<{
    key: string;
    run: () => Promise<number>;
  }> = [
    {
      key: "catalog_products",
      run: async () => {
        const r = await db
          .delete(catalogProducts)
          .where(lt(catalogProducts.fetchedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "search_snapshots",
      run: async () => {
        const r = await db
          .delete(searchSnapshots)
          .where(lt(searchSnapshots.createdAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "trending_snapshots",
      run: async () => {
        const r = await db
          .delete(trendingSnapshots)
          .where(lt(trendingSnapshots.createdAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "trend_signals",
      run: async () => {
        const r = await db
          .delete(trendSignals)
          .where(lt(trendSignals.fetchedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "ad_library_snapshots",
      run: async () => {
        const r = await db
          .delete(adLibrarySnapshots)
          .where(lt(adLibrarySnapshots.fetchedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "tiktok_ads_snapshots",
      run: async () => {
        const r = await db
          .delete(tiktokAdsSnapshots)
          .where(lt(tiktokAdsSnapshots.fetchedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "product_offers",
      run: async () => {
        const r = await db
          .delete(productOffers)
          .where(lt(productOffers.fetchedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "product_listings",
      run: async () => {
        const r = await db
          .delete(productListings)
          .where(lt(productListings.fetchedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "product_features",
      run: async () => {
        const r = await db
          .delete(productFeatures)
          .where(lt(productFeatures.computedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "trending_snapshot_diffs",
      run: async () => {
        const r = await db
          .delete(trendingSnapshotDiffs)
          .where(lt(trendingSnapshotDiffs.createdAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "ingest_runs",
      run: async () => {
        const r = await db
          .delete(ingestRuns)
          .where(lt(ingestRuns.startedAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "api_usage_daily",
      run: async () => {
        const usageCutoff = cutoff.toISOString().slice(0, 10);
        const r = await db
          .delete(apiUsageDaily)
          .where(lt(apiUsageDaily.usageDate, usageCutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "ai_output_cache",
      run: async () => {
        const r = await db
          .delete(aiOutputCache)
          .where(lt(aiOutputCache.expiresAt, cutoff));
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
    {
      key: "discovery_queue_done",
      run: async () => {
        const r = await db.delete(discoveryQueue).where(
          and(
            lt(discoveryQueue.createdAt, cutoff),
            inArray(discoveryQueue.status, ["done", "failed", "skipped"])
          )
        );
        return Number((r as { affectedRows?: number }).affectedRows ?? 0);
      },
    },
  ];

  for (const { key, run } of tables) {
    try {
      report[key] = await run();
    } catch (err) {
      log.warn("retention_prune_failed", {
        table: key,
        error: err instanceof Error ? err.message : String(err),
      });
      report[key] = 0;
    }
  }

  // Orphan canonical products with no recent listings
  try {
    const orphanResult = await db.execute(sql`
      DELETE FROM canonical_products
      WHERE lastSeenAt < ${cutoff}
        AND id NOT IN (SELECT DISTINCT canonicalProductId FROM product_listings)
    `);
    report.canonical_products_orphans =
      Number((orphanResult as { affectedRows?: number }).affectedRows ?? 0);
  } catch (err) {
    log.warn("retention_canonical_prune_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    report.canonical_products_orphans = 0;
  }

  const total = Object.values(report).reduce((s, n) => s + n, 0);
  log.info("data_retention_complete", { retentionDays, totalDeleted: total, report });
  return report;
}
