import type {

  ProductHuntFilters,

  ProductSearchResponse,

  RegionCode,

  SearchPagination,

} from "@shared/searchTypes";

import { ENV } from "../_core/env";

import { applyProductHuntFilters } from "./filters";

import { dedupeResults, type SearchPlatform } from "./utils";

import { searchCatalog } from "../dataPlatform/catalog";

import { getSearchSnapshot, saveSearchSnapshot } from "../dataPlatform/snapshots";

import { searchProductsLive } from "./liveSearch";

import { createLogger } from "../_core/logger";

import { scoreProducts } from "../ranking/scoreProduct";

import { attachRankReasons } from "../trending/rankReason";

import { searchCanonicalByKeyword } from "../dataPlatform/productGraph";

import { getAdjacentQuerySuggestions } from "../discovery/queryExpansion";

import { attachProductsTruthLabels } from "./truthLabels";

import { paginateResults } from "./pagination";

import { allowsSyntheticCatalog, allowsHeuristicTrendScores } from "../truthMode";

import { getSearchProviderStatus, getMarketplaceCoverage } from "./marketplaceCoverage";

export { getSearchProviderStatus, getMarketplaceCoverage };

const log = createLogger("search");



async function withScoring(

  results: ProductSearchResponse["results"],

  region: RegionCode,

  query: string,

  allowHeuristicScores: boolean

) {

  const scored = await scoreProducts(results, region, { query, allowHeuristicScores });

  const enriched = attachRankReasons(scored);

  return attachProductsTruthLabels(enriched, { dataMode: "cached" });

}



function paginateResponse<T extends ProductSearchResponse>(

  response: T,

  pagination?: SearchPagination

): T & { totalCount: number; nextCursor?: number } {

  const { items, totalCount, nextCursor } = paginateResults(response.results, pagination);

  return { ...response, results: items, totalCount, nextCursor };

}



export type SearchOptions = {

  live?: boolean;

  pagination?: SearchPagination;

};



export async function searchProducts(

  query: string,

  platform: SearchPlatform,

  filters?: ProductHuntFilters,

  options?: SearchOptions

): Promise<ProductSearchResponse & { totalCount?: number; nextCursor?: number }> {

  const trimmed = query.trim();

  if (!trimmed) {

    return { results: [], sources: [], isDemo: false, totalCount: 0 };

  }



  const region = filters?.region ?? (ENV.defaultRegion as RegionCode);

  const allowSynthetic = await allowsSyntheticCatalog();

  const allowHeuristic = await allowsHeuristicTrendScores();

  log.info("search_products", { query: trimmed, platform, region, live: Boolean(options?.live) });



  if (options?.live) {

    const live = await searchProductsLive(trimmed, platform, filters);

    if (live.results.length > 0) {

      const scored = await scoreProducts(live.results, region, {

        query: trimmed,

        allowHeuristicScores: allowHeuristic,

      });

      const enriched = attachRankReasons(scored);

      const labeled = attachProductsTruthLabels(enriched, { dataMode: "live" });

      const response = { ...live, results: labeled };

      await saveSearchSnapshot(trimmed, platform, region, response);

      return paginateResponse({ ...response, creditsUsed: 1 }, options.pagination);

    }



    const validSnapshot = await getSearchSnapshot(trimmed, platform, region, false);

    if (validSnapshot && validSnapshot.response.results.length > 0) {

      const filtered = applyProductHuntFilters(

        dedupeResults(validSnapshot.response.results),

        filters

      ).slice(0, ENV.trendingMaxItems);

      log.info("live_search_cache_fallback", { query: trimmed, stale: false });

      const scored = await withScoring(filtered, region, trimmed, allowHeuristic);

      return paginateResponse(

        {

          ...validSnapshot.response,

          results: scored,

          isDemo: false,

          dataMode: "cached",

          cachedAt: validSnapshot.cachedAt.toISOString(),

          stale: false,

          creditsUsed: 1,

          warnings: [

            ...(live.warnings ?? []),

            "Live providers unavailable — showing cached results.",

          ],

          providerAvailability: live.providerAvailability,

        },

        options?.pagination

      );

    }



    const staleSnapshot = await getSearchSnapshot(trimmed, platform, region, true);

    if (staleSnapshot && staleSnapshot.response.results.length > 0) {

      const filtered = applyProductHuntFilters(

        dedupeResults(staleSnapshot.response.results),

        filters

      ).slice(0, ENV.trendingMaxItems);

      log.info("live_search_stale_fallback", { query: trimmed, stale: true });

      const scored = await withScoring(filtered, region, trimmed, allowHeuristic);

      return paginateResponse(

        {

          ...staleSnapshot.response,

          results: attachProductsTruthLabels(scored, { dataMode: "cached", stale: true }),

          isDemo: false,

          dataMode: "cached",

          cachedAt: staleSnapshot.cachedAt.toISOString(),

          stale: true,

          creditsUsed: 1,

          warnings: [

            ...(live.warnings ?? []),

            "Live providers unavailable — showing older cached results.",

          ],

          providerAvailability: live.providerAvailability,

        },

        options?.pagination

      );

    }



    const suggestions = await getAdjacentQuerySuggestions(trimmed, region, 3);

    return paginateResponse(
      { ...live, creditsUsed: 1, recoverySuggestions: suggestions },
      options?.pagination
    );
  }



  const snapshot = await getSearchSnapshot(trimmed, platform, region, true);

  if (snapshot && snapshot.response.results.length > 0) {

    const filtered = applyProductHuntFilters(

      dedupeResults(snapshot.response.results),

      filters

    ).slice(0, ENV.trendingMaxItems);

    const scored = await withScoring(filtered, region, trimmed, allowHeuristic);

    return paginateResponse(

      {

        ...snapshot.response,

        results: attachProductsTruthLabels(scored, {

          dataMode: "cached",

          stale: snapshot.stale,

        }),

        isDemo: false,

        dataMode: "cached",

        cachedAt: snapshot.cachedAt.toISOString(),

        stale: snapshot.stale,

        creditsUsed: 0,

      },

      options?.pagination

    );

  }



  if (allowSynthetic) {

    const catalog = await searchCatalog(trimmed, region, ENV.trendingMaxItems);

    if (catalog.length > 0) {

      const results = applyProductHuntFilters(dedupeResults(catalog), filters).slice(

        0,

        ENV.trendingMaxItems

      );

      const scored = await withScoring(results, region, trimmed, true);

      return paginateResponse(

        {

          results: attachProductsTruthLabels(scored, { dataMode: "cached", synthetic: true }),

          sources: ["free_retail"],

          isDemo: false,

          dataMode: "cached",

          cachedAt: new Date().toISOString(),

          creditsUsed: 0,

        },

        options?.pagination

      );

    }



    const canonical = await searchCanonicalByKeyword(trimmed, region, ENV.trendingMaxItems);

    if (canonical.length > 0) {

      const scored = await withScoring(

        applyProductHuntFilters(canonical, filters).slice(0, ENV.trendingMaxItems),

        region,

        trimmed,

        allowHeuristic

      );

      return paginateResponse(

        {

          results: attachProductsTruthLabels(scored, { dataMode: "cached", synthetic: true }),

          sources: ["free_retail"],

          isDemo: false,

          dataMode: "cached",

          cachedAt: new Date().toISOString(),

          warnings: ["Matched canonical product graph — run Live Search for fresh listings."],

          creditsUsed: 0,

        },

        options?.pagination

      );

    }

  }



  const suggestions = await getAdjacentQuerySuggestions(trimmed, region, 3);



  return {

    results: [],

    sources: [],

    isDemo: false,

    totalCount: 0,

    warnings: allowSynthetic

      ? [

          "No cached results yet. Run daily ingest to populate the catalog, or use Live Search.",

        ]

      : [

          "No live or cached results. Configure marketplace API keys or enable Live Search.",

        ],

    recoverySuggestions: suggestions,

    creditsUsed: 0,

  };

}


