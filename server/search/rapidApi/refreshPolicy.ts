import { ENV } from "../../_core/env";
import type { RapidApiProviderId } from "./caps";

/** How long before the same query+region may be re-fetched. */
export type RapidApiQueryRefreshPeriod = "hour" | "day" | "week" | "month";

export type RapidApiRefreshPolicy = {
  id: RapidApiProviderId;
  /** Official RapidAPI monthly request quota (resets 1st UTC). */
  monthlyCap: number;
  /** Per-UTC-day cap when the free tier is daily (resets midnight UTC). */
  dailyCap?: number;
  /** Gateway / plan hourly cap (resets each clock hour UTC). */
  hourlyCap: number;
  /** Minimum ms between consecutive calls (e.g. 1 req/sec plans). */
  minIntervalMs: number;
  /** Max items returned per single request — always request the highest allowed. */
  maxItemsPerRequest: number;
  /** Minimum time before re-fetching the same query for this provider. */
  queryRefreshPeriod: RapidApiQueryRefreshPeriod;
  /** Ingest priority — higher = scheduled first (data-per-quota efficiency). */
  ingestPriority: number;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

export const QUERY_REFRESH_MS: Record<RapidApiQueryRefreshPeriod, number> = {
  hour: HOUR_MS,
  day: DAY_MS,
  week: WEEK_MS,
  month: MONTH_MS,
};

/** Official RapidAPI free-tier limits — see docs/RAPIDAPI-SUBSCRIPTIONS.md */
export function getRapidApiRefreshPolicies(): RapidApiRefreshPolicy[] {
  return [
    {
      id: "rapidapi_ali_express",
      monthlyCap: ENV.rapidApiAliExpressMonthlyCap,
      dailyCap: ENV.rapidApiAliExpressDailyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 20,
      queryRefreshPeriod: "day",
      ingestPriority: 100,
    },
    {
      id: "rapidapi_ebay_data",
      monthlyCap: ENV.rapidApiEbayDataMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 20,
      queryRefreshPeriod: "week",
      ingestPriority: 95,
    },
    {
      id: "rapidapi_axesso_walmart",
      monthlyCap: ENV.rapidApiAxessoWalmartMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 40,
      queryRefreshPeriod: "week",
      ingestPriority: 90,
    },
    {
      id: "rapidapi_news_api",
      monthlyCap: ENV.rapidApiNewsApiMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "day",
      ingestPriority: 85,
    },
    {
      id: "rapidapi_google_search",
      monthlyCap: ENV.rapidApiGoogleSearchMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "day",
      ingestPriority: 80,
    },
    {
      id: "rapidapi_news_data",
      monthlyCap: ENV.rapidApiNewsDataMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 1000,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "week",
      ingestPriority: 70,
    },
    {
      id: "rapidapi_web_search",
      monthlyCap: ENV.rapidApiWebSearchMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 1000,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "week",
      ingestPriority: 65,
    },
    {
      id: "rapidapi_aliexpress_datahub",
      monthlyCap: ENV.rapidApiAliexpressDatahubMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 20,
      queryRefreshPeriod: "week",
      ingestPriority: 60,
    },
    {
      id: "rapidapi_product_search",
      monthlyCap: ENV.rapidApiProductSearchMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: ENV.rapidApiProductSearchLimit,
      queryRefreshPeriod: "week",
      ingestPriority: 55,
    },
    {
      id: "rapidapi_amazon",
      monthlyCap: ENV.rapidApiAmazonMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "week",
      ingestPriority: 50,
    },
    {
      id: "rapidapi_etsy",
      monthlyCap: ENV.rapidApiEtsyMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "month",
      ingestPriority: 40,
    },
    {
      id: "rapidapi_pangolinfo",
      monthlyCap: ENV.rapidApiPangolinfoMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "month",
      ingestPriority: 35,
    },
    {
      id: "rapidapi_lazada",
      monthlyCap: ENV.rapidApiLazadaMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 10,
      queryRefreshPeriod: "month",
      ingestPriority: 30,
    },
    {
      id: "rapidapi_taobao",
      monthlyCap: ENV.rapidApiTaobaoMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 5,
      queryRefreshPeriod: "month",
      ingestPriority: 25,
    },
    {
      id: "rapidapi_alibaba",
      monthlyCap: ENV.rapidApiAlibabaMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 0,
      maxItemsPerRequest: 1,
      queryRefreshPeriod: "month",
      ingestPriority: 10,
    },
    {
      id: "rapidapi_tiktok_api",
      monthlyCap: ENV.rapidApiTiktokApiMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 1000,
      maxItemsPerRequest: ENV.rapidApiTiktokApiMaxItems,
      queryRefreshPeriod: "week",
      ingestPriority: 45,
    },
    {
      id: "rapidapi_tiktok_scraper",
      monthlyCap: ENV.rapidApiTiktokScraperMonthlyCap,
      hourlyCap: 1000,
      minIntervalMs: 1000,
      maxItemsPerRequest: ENV.rapidApiTiktokScraperMaxItems,
      queryRefreshPeriod: "month",
      ingestPriority: 20,
    },
  ];
}

export function getRapidApiRefreshPolicy(
  id: RapidApiProviderId
): RapidApiRefreshPolicy | undefined {
  return getRapidApiRefreshPolicies().find((p) => p.id === id);
}

export function queryRefreshMs(period: RapidApiQueryRefreshPeriod): number {
  return QUERY_REFRESH_MS[period];
}
