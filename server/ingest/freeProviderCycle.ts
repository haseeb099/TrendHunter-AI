import type { RegionCode } from "@shared/searchTypes";
import { PRODUCT_CATEGORIES } from "@shared/searchTypes";
import { createLogger } from "../_core/logger";
import { ENV } from "../_core/env";
import { persistListings } from "../dataPlatform/productGraph";
import {
  canUseProviderNow,
  getProviderBudgetSnapshot,
  recordProviderApiCall,
} from "../dataPlatform/providerBudget";
import { getCategorySeedQueries } from "../search/categories";
import { searchShoptera } from "../search/shoptera";
import { searchCj } from "../search/cj";
import { searchFreeRetail } from "../search/freeRetail";
import { dedupeResults } from "../search/utils";

const log = createLogger("free-provider-ingest");

const INGEST_CTX = { ingest: true } as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Hourly scrape + store for free-tier APIs (Shoptera 300/hr, CJ points + 1 req/s, free catalogs).
 * Paid APIs are handled by the trending queue with separate budgets.
 */
export async function runFreeProviderIngestCycle(trigger: string) {
  log.info("free_provider_cycle_start", { trigger });

  const regions = ENV.ingestRegions;
  const stats = {
    shoptera: 0,
    cj: 0,
    free_retail: 0,
    stored: 0,
    skipped: 0,
  };

  for (const region of regions) {
    const queries = ["trending products", "best sellers"];
    for (const cat of PRODUCT_CATEGORIES.slice(0, ENV.ingestTrendingMaxCategories)) {
      for (const seed of getCategorySeedQueries(cat).slice(0, 1)) {
        if (!queries.includes(seed)) queries.push(seed);
      }
    }

    const cjBudget = await getProviderBudgetSnapshot("cj");
    const cjDailyRemaining =
      cjBudget.dailyCap != null
        ? Math.max(0, cjBudget.dailyCap - cjBudget.dailyUsed)
        : Number.POSITIVE_INFINITY;
    const cjCallsThisCycle = Math.min(
      5,
      cjDailyRemaining,
      Math.ceil(cjDailyRemaining / Math.max(1, 24 - new Date().getUTCHours()))
    );
    let cjCallsMade = 0;

    for (const query of queries) {
      if (await canUseProviderNow("shoptera", INGEST_CTX)) {
        try {
          const results = await searchShoptera(query, region, { ingest: true });
          if (results.length > 0) {
            await persistListings(dedupeResults(results), region);
            stats.shoptera += 1;
            stats.stored += results.length;
          }
        } catch (err) {
          log.warn("shoptera_ingest_failed", { region, query, error: String(err) });
        }
      } else {
        stats.skipped += 1;
        break;
      }

      if (cjCallsMade < cjCallsThisCycle && (await canUseProviderNow("cj", INGEST_CTX))) {
        try {
          const results = await searchCj(query, region, { maxResults: 15, ingest: true });
          cjCallsMade += 1;
          if (results.length > 0) {
            await persistListings(dedupeResults(results), region);
            stats.cj += 1;
            stats.stored += results.length;
          }
          await sleep(ENV.cjMinIntervalMs);
        } catch (err) {
          log.warn("cj_ingest_failed", { region, query, error: String(err) });
        }
      }

      if (await canUseProviderNow("free_retail", INGEST_CTX)) {
        try {
          const results = await searchFreeRetail(query, region);
          if (results.length > 0) {
            await persistListings(dedupeResults(results), region);
            await recordProviderApiCall("free_retail");
            stats.free_retail += 1;
            stats.stored += results.length;
          }
        } catch (err) {
          log.warn("free_retail_ingest_failed", { region, query, error: String(err) });
        }
      }
    }
  }

  const budgets = await Promise.all([
    getProviderBudgetSnapshot("shoptera"),
    getProviderBudgetSnapshot("cj"),
  ]);

  log.info("free_provider_cycle_complete", { trigger, stats, budgets });

  return { stats, budgets };
}
