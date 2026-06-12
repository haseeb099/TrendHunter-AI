import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";

import { PRODUCT_CATEGORIES } from "@shared/searchTypes";

import { createLogger } from "../../_core/logger";

import { ENV } from "../../_core/env";

import { persistListings } from "../../dataPlatform/productGraph";

import { getCategorySeedQueries } from "../categories";

import { dedupeResults } from "../utils";

import { isRapidApiConfigured, type RapidApiProviderId } from "./caps";

import { searchRapidProducts } from "./productSearch";

import { searchRapidAmazonProducts } from "./amazonSearch";

import { searchRapidGoogle } from "./googleSearch";

import { searchRapidEtsy } from "./etsy";

import { searchRapidPangolinfoAmazon } from "./pangolinfo";

import { searchRapidLazadaByImage } from "./lazada";

import { checkRapidAlibabaHealth } from "./alibaba";

import { searchRapidEbayData } from "./ebayData";

import { searchRapidAxessoWalmart } from "./axessoWalmart";

import { searchRapidAliExpress } from "./aliExpressScraper";

import { searchRapidAliexpressDatahub } from "./aliexpressDatahub";

import { searchRapidWeb } from "./webSearch";

import { searchRapidNews } from "./newsData";

import { searchRapidNewsApi } from "./newsApi";

import { recordRapidQueryFetch, wasRapidQueryFetchedRecently } from "./queryLog";

import {

  applyGlobalIngestCeiling,

  getAllRapidApiProviderBudgets,

  type RapidApiProviderBudget,

} from "./schedule";

import type { RapidApiRefreshPolicy } from "./refreshPolicy";



const log = createLogger("rapid-api-ingest");



const DISCOVERY_QUERIES = [

  "trending products 2026",

  "best dropshipping products",

  "viral tiktok products",

];



const SAMPLE_IMAGE_URL =

  "https://m.media-amazon.com/images/I/81+6QOdSOlL._AC_UX695_.jpg";



function rotatedCategorySeeds(max: number): string[] {

  const day = new Date().getUTCDate();

  const seeds: string[] = [];

  for (let i = 0; i < PRODUCT_CATEGORIES.length && seeds.length < max; i++) {

    const cat = PRODUCT_CATEGORIES[(day + i) % PRODUCT_CATEGORIES.length]!;

    const catSeeds = getCategorySeedQueries(cat);

    if (catSeeds[0] && !seeds.includes(catSeeds[0])) {

      seeds.push(catSeeds[0]);

    }

  }

  return seeds;

}



async function pickFreshQuery(

  provider: RapidApiProviderId,

  region: RegionCode,

  candidates: string[]

): Promise<string | null> {

  const day = new Date().getUTCDate();

  for (let i = 0; i < candidates.length; i++) {

    const query = candidates[(day + i) % candidates.length]!;

    if (!(await wasRapidQueryFetchedRecently(provider, query, region))) {

      return query;

    }

  }

  return null;

}



type IngestJob = {

  provider: RapidApiProviderId;

  queryKey: string;

  region: RegionCode;

  fetcher: () => Promise<ProductSearchResult[]>;

};



function makeFetcher(

  provider: RapidApiProviderId,

  query: string,

  region: RegionCode,

  policy: RapidApiRefreshPolicy

): () => Promise<ProductSearchResult[]> {

  switch (provider) {

    case "rapidapi_ali_express":

      return () => searchRapidAliExpress(query, region);

    case "rapidapi_ebay_data":

      return () => searchRapidEbayData(query, region, { limit: policy.maxItemsPerRequest });

    case "rapidapi_axesso_walmart":

      return () => searchRapidAxessoWalmart(query, region === "GLOBAL" ? "US" : region);

    case "rapidapi_news_api":

      return () => searchRapidNewsApi(query, region);

    case "rapidapi_news_data":

      return () => searchRapidNews(query, region, { limit: policy.maxItemsPerRequest });

    case "rapidapi_web_search":

      return () => searchRapidWeb(query, region, { num: policy.maxItemsPerRequest });

    case "rapidapi_aliexpress_datahub":

      return () => searchRapidAliexpressDatahub(query, region);

    case "rapidapi_google_search":

      return () => searchRapidGoogle(query, region, { maxResults: policy.maxItemsPerRequest });

    case "rapidapi_product_search":

      return () => searchRapidProducts(query, region, { limit: policy.maxItemsPerRequest });

    case "rapidapi_amazon":

      return () => searchRapidAmazonProducts(query, region, { maxResults: policy.maxItemsPerRequest });

    case "rapidapi_etsy":

      return () => searchRapidEtsy(query, region);

    case "rapidapi_pangolinfo":

      return () => searchRapidPangolinfoAmazon(query, region);

    case "rapidapi_lazada":

      return () => searchRapidLazadaByImage(SAMPLE_IMAGE_URL, "GLOBAL");

    default:

      return async () => [];

  }

}



function candidateQueries(

  provider: RapidApiProviderId,

  productSeeds: string[]

): string[] {

  if (provider === "rapidapi_news_api" || provider === "rapidapi_google_search") {

    return DISCOVERY_QUERIES;

  }

  if (provider === "rapidapi_lazada") {

    return [`image:${SAMPLE_IMAGE_URL.slice(-24)}`];

  }

  return productSeeds.length > 0 ? productSeeds : ["trending products"];

}



async function buildJobsForProvider(

  budget: RapidApiProviderBudget,

  regions: RegionCode[],

  productSeeds: string[],

  maxJobs: number

): Promise<IngestJob[]> {

  const { provider, policy } = budget;

  const jobs: IngestJob[] = [];

  const usRegion = regions.includes("US") ? "US" : regions[0]!;

  const targetRegions =

    provider === "rapidapi_axesso_walmart"

      ? (["US"] as RegionCode[])

      : provider === "rapidapi_lazada"

        ? (["GLOBAL"] as RegionCode[])

        : provider === "rapidapi_news_api" ||

            provider === "rapidapi_google_search" ||

            provider === "rapidapi_ali_express" ||

            provider === "rapidapi_ebay_data" ||

            provider === "rapidapi_web_search" ||

            provider === "rapidapi_news_data" ||

            provider === "rapidapi_aliexpress_datahub"

          ? [usRegion]

          : regions;



  for (const region of targetRegions) {

    if (jobs.length >= maxJobs) break;

    const candidates = candidateQueries(provider, productSeeds);

    const query = await pickFreshQuery(provider, region, candidates);

    if (!query) continue;



    const queryKey =

      provider === "rapidapi_amazon" ? `search:${query}` : query;



    jobs.push({

      provider,

      queryKey,

      region,

      fetcher: makeFetcher(provider, query, region, policy),

    });

  }



  return jobs;

}



/**

 * Daily RapidAPI ingest — per-provider budgets spread monthly/daily/hourly free tiers.

 * Each call requests max products per response; queries refresh per provider policy.

 */

export async function runRapidApiIngestCycle(trigger: string) {

  if (!isRapidApiConfigured()) {

    return {

      calls: 0,

      stored: 0,

      skipped: 0,

      errors: [] as string[],

      budgets: {} as Record<string, number>,

    };

  }



  const stats = {

    calls: 0,

    stored: 0,

    skipped: 0,

    errors: [] as string[],

    budgets: {} as Record<string, number>,

  };

  const regions = ENV.ingestRegions;

  const productSeeds = rotatedCategorySeeds(12);



  const budgets = await getAllRapidApiProviderBudgets();

  const allowance = applyGlobalIngestCeiling(budgets);



  for (const [provider, calls] of Array.from(allowance.entries())) {
    stats.budgets[provider] = calls;
  }



  const tryIngest = async (job: IngestJob) => {

    if (await wasRapidQueryFetchedRecently(job.provider, job.queryKey, job.region)) {

      stats.skipped += 1;

      return false;

    }



    try {

      const results = await job.fetcher();

      stats.calls += 1;

      if (results.length > 0) {

        await persistListings(dedupeResults(results), job.region);

        stats.stored += results.length;

      }

      await recordRapidQueryFetch(job.provider, job.queryKey, job.region, results.length);

      return true;

    } catch (err) {

      const msg = err instanceof Error ? err.message : String(err);

      stats.errors.push(`${job.provider}/${job.region}/${job.queryKey}: ${msg}`);

      log.warn("rapid_ingest_failed", {

        provider: job.provider,

        region: job.region,

        queryKey: job.queryKey,

        error: msg,

      });

      return false;

    }

  };



  for (const budget of budgets) {

    const maxCalls = allowance.get(budget.provider) ?? 0;

    if (maxCalls <= 0) continue;



    let made = 0;

    let attempts = 0;

    const maxAttempts = maxCalls * 3;



    while (made < maxCalls && attempts < maxAttempts) {

      attempts += 1;

      const jobs = await buildJobsForProvider(

        budget,

        regions,

        productSeeds,

        maxCalls - made

      );

      if (jobs.length === 0) break;



      for (const job of jobs) {

        if (made >= maxCalls) break;

        const ok = await tryIngest(job);

        if (ok) made += 1;

      }

    }

  }



  if (ENV.rapidApiAlibabaEnabled && new Date().getUTCDay() === 1) {

    const alibabaBudget = allowance.get("rapidapi_alibaba") ?? 0;

    const healthKey = "health-check";

    if (

      alibabaBudget > 0 &&

      !(await wasRapidQueryFetchedRecently("rapidapi_alibaba", healthKey, "GLOBAL"))

    ) {

      try {

        const ok = await checkRapidAlibabaHealth();

        stats.calls += 1;

        await recordRapidQueryFetch("rapidapi_alibaba", healthKey, "GLOBAL", ok ? 1 : 0);

        log.info("alibaba_health", { ok });

      } catch (err) {

        stats.errors.push(`alibaba_health: ${err instanceof Error ? err.message : String(err)}`);

      }

    }

  }



  log.info("rapid_api_ingest_complete", { trigger, stats });

  return stats;

}


