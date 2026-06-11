import { eq } from "drizzle-orm";

import { ingestRuns } from "../../drizzle/schema";

import { getDb } from "../db";

import { ingestFreeCatalog, pruneOldCatalog } from "../dataPlatform/catalog";

import { ingestTrendKeywords } from "../intelligence/trends";

import { ingestAdKeywords } from "../intelligence/adLibrary";

import { ingestTikTokAdKeywords } from "../intelligence/tiktokAds";

import { refreshTrendingSnapshots } from "./trendingRefresh";

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

  const db = await getDb();

  const apiCounts: Record<string, number> = {};

  const errors: string[] = [];



  let runId = 0;

  if (db) {

    const insert = await db.insert(ingestRuns).values({ status: "running" });

    runId = Number((insert as { insertId?: number }[])[0]?.insertId ?? 0);

  }



  const regions: RegionCode[] = ENV.supportedRegions;



  try {

    const catalogCount = await ingestFreeCatalog(regions);

    apiCounts.catalog_products = catalogCount;

    await pruneOldCatalog();

  } catch (err) {

    errors.push(`catalog: ${err instanceof Error ? err.message : String(err)}`);

  }



  for (const region of regions) {

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



  for (const region of regions) {

    try {

      await refreshTrendingSnapshots(region);

      apiCounts[`trending_${region}`] = 1;

    } catch (err) {

      errors.push(`trending/${region}: ${err instanceof Error ? err.message : String(err)}`);

    }

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


