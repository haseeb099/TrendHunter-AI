import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { PRODUCT_CATEGORIES } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { createLogger } from "../_core/logger";
import { persistListings } from "../dataPlatform/productGraph";
import { getCategorySeedQueries } from "../search/categories";
import {
  canUseAnySerperKey,
  getSerperPoolStatus,
  serperPoolSummary,
} from "../search/serperPool";
import {
  searchGoogleShoppingSerper,
  searchImagesSerper,
  searchNewsSerper,
  searchPlacesSerper,
  searchWebSerper,
} from "../search/serper";
import { dedupeResults } from "../search/utils";

const log = createLogger("serper-ingest");

type SerperIngestTask = {
  label: string;
  run: (query: string, region: RegionCode) => Promise<unknown[]>;
};

const TASKS: SerperIngestTask[] = [
  { label: "shopping", run: (q, r) => searchGoogleShoppingSerper(q, r, { maxResults: 20 }) },
  { label: "web", run: (q, r) => searchWebSerper(q, r, { maxResults: 8 }) },
  { label: "images", run: (q, r) => searchImagesSerper(q, r, { maxResults: 6 }) },
  { label: "news", run: (q, r) => searchNewsSerper(q, r, { maxResults: 5 }) },
  { label: "places", run: (q, r) => searchPlacesSerper(q, r, { maxResults: 5 }) },
];

/**
 * Hourly Serper ingest — uses shopping/web/images/news/places across regions.
 * Rotates through SERPER_API_KEYS when an account's weekly 2,500 cap is hit.
 */
export async function runSerperIngestCycle(trigger: string) {
  log.info("serper_cycle_start", { trigger });

  if (!(await canUseAnySerperKey())) {
    const pool = await getSerperPoolStatus();
    log.warn("serper_cycle_skipped_exhausted", serperPoolSummary(pool));
    return { calls: 0, stored: 0, pool: serperPoolSummary(pool) };
  }

  let calls = 0;
  let stored = 0;
  const maxCalls = ENV.serperIngestMaxPerCycle;

  const queries: string[] = ["trending products 2026", "best selling gadgets"];
  for (const cat of PRODUCT_CATEGORIES.slice(0, ENV.ingestTrendingMaxCategories)) {
    const seed = getCategorySeedQueries(cat)[0];
    if (seed && !queries.includes(seed)) queries.push(seed);
  }

  outer: for (const region of ENV.ingestRegions) {
    for (const query of queries) {
      for (const task of TASKS) {
        if (calls >= maxCalls) break outer;
        if (!(await canUseAnySerperKey())) break outer;

        try {
          const results = await task.run(query, region);
          calls += 1;
          if (results.length > 0) {
            await persistListings(dedupeResults(results as ProductSearchResult[]), region);
            stored += results.length;
          }
        } catch (err) {
          log.warn("serper_task_failed", {
            task: task.label,
            region,
            query,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  const pool = await getSerperPoolStatus();
  const summary = serperPoolSummary(pool);
  log.info("serper_cycle_complete", { trigger, calls, stored, pool: summary });

  return { calls, stored, pool: summary };
}
