import { eq } from "drizzle-orm";

import { ingestRuns } from "../../drizzle/schema";

import { getDb, pruneDuplicateTrendingSnapshots } from "../db";

import { ingestFreeCatalog } from "../dataPlatform/catalog";

import { ingestTrendKeywords } from "../intelligence/trends";

import { ingestAdKeywords } from "../intelligence/adLibrary";

import { ingestTikTokAdKeywords } from "../intelligence/tiktokAds";

import { runTrendingIngestCycle } from "./trendingCycle";

import type { RegionCode } from "@shared/searchTypes";

import { getOffersForProduct } from "../suppliers";

import { createLogger } from "../_core/logger";

import { ENV } from "../_core/env";

import {
  boostQueryPriorityFromEngagement,
  enqueueDiscoveryQueries,
  processDiscoveryQueue,
} from "../discovery/queryExpansion";
import { computeSnapshotDiffs } from "../dataPlatform/snapshotDiff";

import { processIngestRetries } from "./ingestRetries";
import { resetIngestLiveBudget, getIngestLiveBudgetRemaining } from "./liveBudget";
import { pruneStalePlatformData } from "./dataRetention";
import { syncAmazonCategoriesFromRapidApi } from "../search/amazonCategorySync";
import { runRapidApiIngestCycle } from "../search/rapidApi/ingest";
import { runFreeProviderIngestCycle } from "./freeProviderCycle";
import { runSerperIngestCycle } from "./serperCycle";



const log = createLogger("ingest");



const TREND_KEYWORDS = [

  "wireless earbuds",

  "portable blender",

  "led strip lights",

  "pet grooming kit",

  "skincare serum",

];



export async function runDailyIngest(): Promise<{

  runId: number;

  apiCounts: Record<string, number>;

  errors: string[];

}> {

  log.info("daily_ingest_start");

  resetIngestLiveBudget();

  const pruned = await pruneDuplicateTrendingSnapshots();
  if (pruned > 0) {
    log.info("trending_snapshots_pruned", { deleted: pruned });
  }

  const db = await getDb();

  const apiCounts: Record<string, number> = {};

  const errors: string[] = [];



  let runId = 0;

  if (db) {

    const insert = await db.insert(ingestRuns).values({ status: "running" });

    runId = Number((insert as { insertId?: number }[])[0]?.insertId ?? 0);

  }



  const regions: RegionCode[] = ENV.ingestRegions;
  const intelRegions: RegionCode[] = ENV.supportedRegions;



  try {

    const catalogCount = await ingestFreeCatalog(regions);

    apiCounts.catalog_products = catalogCount;

  } catch (err) {

    errors.push(`catalog: ${err instanceof Error ? err.message : String(err)}`);

  }

  try {
    const amazonCat = await syncAmazonCategoriesFromRapidApi(regions);
    apiCounts.amazon_category_syncs = amazonCat.synced;
    apiCounts.amazon_taxonomy_enriched = amazonCat.enriched;
    if (amazonCat.errors.length > 0) {
      errors.push(...amazonCat.errors.map((e) => `amazon_categories: ${e}`));
    }
  } catch (err) {
    errors.push(`amazon_categories: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const rapid = await runRapidApiIngestCycle("daily");
    apiCounts.rapid_api_calls = rapid.calls;
    apiCounts.rapid_api_stored = rapid.stored;
    apiCounts.rapid_api_skipped = rapid.skipped;
    if (rapid.budgets) {
      apiCounts.rapid_api_budgets = Object.keys(rapid.budgets).length;
    }
    if (rapid.errors.length > 0) {
      errors.push(...rapid.errors.map((e) => `rapid_api: ${e}`));
    }
  } catch (err) {
    errors.push(`rapid_api: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const free = await runFreeProviderIngestCycle("daily");
    apiCounts.free_shoptera = free.stats.shoptera;
    apiCounts.free_cj = free.stats.cj;
    apiCounts.free_retail = free.stats.free_retail;
    apiCounts.free_provider_stored = free.stats.stored;
  } catch (err) {
    errors.push(`free_providers: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const serper = await runSerperIngestCycle("daily");
    apiCounts.serper_calls = serper.calls;
    apiCounts.serper_stored = serper.stored;
  } catch (err) {
    errors.push(`serper: ${err instanceof Error ? err.message : String(err)}`);
  }

  for (const region of intelRegions) {

    try {

      const trendCount = await ingestTrendKeywords(TREND_KEYWORDS, region);

      apiCounts[`trends_${region}`] = trendCount;

    } catch (err) {

      errors.push(`trends/${region}: ${err instanceof Error ? err.message : String(err)}`);

    }



    try {

      const adCount = await ingestAdKeywords(TREND_KEYWORDS, region);

      apiCounts[`ads_${region}`] = adCount;

    } catch (err) {

      errors.push(`ads/${region}: ${err instanceof Error ? err.message : String(err)}`);

    }



    try {

      const tiktokCount = await ingestTikTokAdKeywords(TREND_KEYWORDS, region);

      apiCounts[`tiktok_ads_${region}`] = tiktokCount;

    } catch (err) {

      errors.push(`tiktok_ads/${region}: ${err instanceof Error ? err.message : String(err)}`);

    }

  }



  try {
    await boostQueryPriorityFromEngagement();
    apiCounts.discovery_enqueued = await enqueueDiscoveryQueries(regions);
  } catch (err) {
    errors.push(`discovery_enqueue: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const discovery = await processDiscoveryQueue(regions);
    apiCounts.discovery_processed = discovery.processed;
    errors.push(...discovery.errors.map((e: string) => `discovery: ${e}`));
  } catch (err) {
    errors.push(`discovery_process: ${err instanceof Error ? err.message : String(err)}`);
  }



  try {
    const trending = await runTrendingIngestCycle("daily");
    apiCounts.trending_queue_processed = trending.processed;
    apiCounts.trending_queue_seeded = trending.seeded;
    apiCounts.trending_hourly_used = trending.hourlyUsage.used;
    if (trending.errors.length > 0) {
      errors.push(...trending.errors.slice(0, 10).map((e) => `trending_queue: ${e}`));
    }
  } catch (err) {
    errors.push(`trending_queue: ${err instanceof Error ? err.message : String(err)}`);
  }



  for (const region of regions) {

    try {

      const diffs = await computeSnapshotDiffs(region);

      apiCounts[`snapshot_diffs_${region}`] = diffs;

    } catch (err) {

      errors.push(`snapshot_diffs/${region}: ${err instanceof Error ? err.message : String(err)}`);

    }

  }



  for (const kw of TREND_KEYWORDS.slice(0, 3)) {

    try {

      await getOffersForProduct({ title: kw, region: "US", forceRefresh: true });

      apiCounts.supplier_offers = (apiCounts.supplier_offers ?? 0) + 1;

    } catch (err) {

      errors.push(`offers/${kw}: ${err instanceof Error ? err.message : String(err)}`);

    }

  }



  try {

    const retries = await processIngestRetries();

    apiCounts.ingest_retries = retries.processed;

    errors.push(...retries.errors.map((e) => `retry: ${e}`));

  } catch (err) {

    errors.push(`ingest_retries: ${err instanceof Error ? err.message : String(err)}`);

  }

  try {
    const retention = await pruneStalePlatformData();
    apiCounts.data_retention_deleted = Object.values(retention).reduce((s, n) => s + n, 0);
    apiCounts.live_search_budget_remaining = getIngestLiveBudgetRemaining();
  } catch (err) {
    errors.push(`data_retention: ${err instanceof Error ? err.message : String(err)}`);
  }

  const status =

    errors.length > 0 && Object.keys(apiCounts).length === 0 ? "failed" : "completed";



  if (db && runId) {

    await db

      .update(ingestRuns)

      .set({

        status,

        apiCounts,

        errors,

        completedAt: new Date(),

      })

      .where(eq(ingestRuns.id, runId));

  }



  log.info("daily_ingest_complete", {

    runId,

    apiCounts,

    errorCount: errors.length,

  });



  try {

    const { processRisingKeywordAlerts, sendDailyIntelDigests } = await import(

      "../intelligence/alertJobs"

    );

    const alerts = await processRisingKeywordAlerts();

    const digests = await sendDailyIntelDigests();

    log.info("Intel alerts processed", {

      alertsChecked: alerts.checked,

      alertsSent: alerts.alerted,

      digestsSent: digests.sent,

    });

  } catch (err) {

    errors.push(`intel-alerts: ${err instanceof Error ? err.message : String(err)}`);

  }



  return { runId, apiCounts, errors };

}


