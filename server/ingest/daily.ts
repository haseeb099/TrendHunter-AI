import { eq } from "drizzle-orm";
import { ingestRuns } from "../../drizzle/schema";
import { getDb } from "../db";
import { ingestFreeCatalog, pruneOldCatalog } from "../dataPlatform/catalog";
import { ingestTrendKeywords } from "../intelligence/trends";
import { ingestAdKeywords } from "../intelligence/adLibrary";
import { ingestTikTokAdKeywords } from "../intelligence/tiktokAds";
import { refreshTrendingSnapshots } from "./trendingRefresh";
import { searchProductsLive } from "../search/liveSearch";
import { saveSearchSnapshot } from "../dataPlatform/snapshots";
import type { RegionCode } from "@shared/searchTypes";
import { getOffersForProduct } from "../suppliers";

const TREND_KEYWORDS = [
  "wireless earbuds",
  "portable blender",
  "led strip lights",
  "pet grooming kit",
  "skincare serum",
];

const SEARCH_SEED = [
  { query: "wireless earbuds", platform: "all" as const },
  { query: "kitchen gadget", platform: "all" as const },
  { query: "yoga mat", platform: "shopify" as const },
];

export async function runDailyIngest(): Promise<{
  runId: number;
  apiCounts: Record<string, number>;
  errors: string[];
}> {
  const db = await getDb();
  const apiCounts: Record<string, number> = {};
  const errors: string[] = [];

  let runId = 0;
  if (db) {
    const insert = await db.insert(ingestRuns).values({ status: "running" });
    runId = Number((insert as { insertId?: number }[])[0]?.insertId ?? 0);
  }

  const regions: RegionCode[] = ["US", "UK"];

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

  for (const region of regions) {
    try {
      await refreshTrendingSnapshots(region);
      apiCounts[`trending_${region}`] = 1;
    } catch (err) {
      errors.push(`trending/${region}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const seed of SEARCH_SEED) {
    for (const region of regions) {
      try {
        const live = await searchProductsLive(seed.query, seed.platform, { region });
        if (!live.isDemo) {
          await saveSearchSnapshot(seed.query, seed.platform, region, live);
          apiCounts.live_search = (apiCounts.live_search ?? 0) + 1;
        }
      } catch (err) {
        errors.push(`search/${seed.query}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Pre-warm supplier offers for top keywords
  for (const kw of TREND_KEYWORDS.slice(0, 3)) {
    try {
      await getOffersForProduct({ title: kw, region: "US", forceRefresh: true });
      apiCounts.supplier_offers = (apiCounts.supplier_offers ?? 0) + 1;
    } catch (err) {
      errors.push(`offers/${kw}: ${err instanceof Error ? err.message : String(err)}`);
    }
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

  console.log(
    `[Ingest] Completed run #${runId}: ${JSON.stringify(apiCounts)}` +
      (errors.length ? ` errors=${errors.length}` : "")
  );

  try {
    const { processRisingKeywordAlerts, sendDailyIntelDigests } = await import(
      "../intelligence/alertJobs"
    );
    const alerts = await processRisingKeywordAlerts();
    const digests = await sendDailyIntelDigests();
    console.log(
      `[Ingest] Intel alerts: checked=${alerts.checked} sent=${alerts.alerted}; digests sent=${digests.sent}`
    );
  } catch (err) {
    errors.push(`intel-alerts: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { runId, apiCounts, errors };
}
