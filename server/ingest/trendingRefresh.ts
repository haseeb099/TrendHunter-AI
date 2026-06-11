import type { RegionCode } from "@shared/searchTypes";

import { ENV } from "../_core/env";

import { upsertTrendingSnapshot } from "../db";

import { searchProductsLive } from "../search/liveSearch";

import { PRODUCT_CATEGORIES } from "@shared/searchTypes";

import { applyProductHuntFilters } from "../search/filters";

import { dedupeResults } from "../search/utils";

import { fuseProductTrendScores } from "./signalFusion";
import { enrichTrendingResults } from "../trending/rankReason";
import { mergeSearchResults } from "../dataPlatform/productGraph";



const DEFAULT_TRENDING_QUERIES = [

  "wireless earbuds",

  "led lights",

  "phone accessories",

  "skincare serum",

  "pet feeder",

];



async function buildTrendingForRegion(region: RegionCode, category?: string) {

  const filters = { region, category, sort: "trend_score" as const };

  const queries = category ? DEFAULT_TRENDING_QUERIES.slice(0, 3) : DEFAULT_TRENDING_QUERIES.slice(0, 4);



  const allResults: Awaited<ReturnType<typeof searchProductsLive>>["results"] = [];

  const sourcesSet = new Set<string>();



  for (const q of queries) {

    try {

      const response = await searchProductsLive(q, "all", filters);

      response.sources.forEach((s) => sourcesSet.add(s));

      allResults.push(...response.results);

    } catch (err) {

      console.warn(`[Ingest] trending query failed ${q}:`, err);

    }

  }



  const merged = mergeSearchResults(dedupeResults(allResults));
  const deduped = applyProductHuntFilters(merged, filters);

  const fused = await fuseProductTrendScores(deduped, region, { forceTrending: true });



  const results = enrichTrendingResults(
    fused
      .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
      .slice(0, ENV.trendingMaxItems)
  );



  const expiresAt = new Date(Date.now() + ENV.trendingCacheTtlHours * 60 * 60 * 1000);



  await upsertTrendingSnapshot({

    region,

    category: category ?? null,

    payload: results,

    sources: Array.from(sourcesSet),

    isDemo: false,

    expiresAt,

  });

}



export async function refreshTrendingSnapshots(region: RegionCode) {

  await buildTrendingForRegion(region);

  for (const cat of PRODUCT_CATEGORIES) {

    await buildTrendingForRegion(region, cat);

  }

}


