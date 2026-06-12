import type { RegionCode } from "@shared/searchTypes";

const VALID_REGIONS: RegionCode[] = ["US", "UK", "EU", "GLOBAL"];

export function parseSupportedRegions(csv: string): RegionCode[] {
  const parsed = csv
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is RegionCode => VALID_REGIONS.includes(s as RegionCode));
  return parsed.length > 0 ? parsed : ["US", "UK", "EU", "GLOBAL"];
}

export const ENV = {
  appId: process.env.APP_ID ?? "trendhunter",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "3000", 10),
  openaiApiKey:
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim() ||
    "",
  openaiApiBase: (() => {
    const explicit = process.env.OPENAI_API_BASE?.replace(/\/$/, "");
    if (explicit) return explicit;
    if (process.env.GROQ_API_KEY?.trim() && !process.env.OPENAI_API_KEY?.trim()) {
      return "https://api.groq.com/openai/v1";
    }
    return "https://api.openai.com/v1";
  })(),
  openaiModel:
    process.env.OPENAI_MODEL?.trim() ||
    (process.env.GROQ_API_KEY?.trim() && !process.env.OPENAI_API_KEY?.trim()
      ? "openai/gpt-oss-20b"
      : "gpt-4o-mini"),
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  uploadsDir: process.env.UPLOADS_DIR ?? "uploads",
  ebayClientId: process.env.EBAY_CLIENT_ID ?? "",
  ebayClientSecret: process.env.EBAY_CLIENT_SECRET ?? "",
  ebayEnv: process.env.EBAY_ENV === "production" ? "production" : "sandbox",
  ebayMarketplaceId: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US",
  serpApiKey: process.env.SERPAPI_KEY ?? "",
  serpAmazonDomain: process.env.SERPAPI_AMAZON_DOMAIN ?? "amazon.com",
  serpGoogleCountry: process.env.SERPAPI_GOOGLE_COUNTRY ?? "us",
  serpGoogleLanguage: process.env.SERPAPI_GOOGLE_LANGUAGE ?? "en",
  /** Serper.dev — Google Search/Shopping (https://serper.dev) */
  serperApiKey: process.env.SERPER_API_KEY?.trim() ?? "",
  /** Extra Serper free-tier accounts — comma-separated, rotated when weekly cap hit */
  serperApiKeys: (process.env.SERPER_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  justSerpApiKey: process.env.JUSTSERP_API_KEY?.trim() ?? "",
  tiktokAppKey: process.env.TIKTOK_APP_KEY ?? "",
  tiktokAppSecret: process.env.TIKTOK_APP_SECRET ?? "",
  tiktokAccessToken: process.env.TIKTOK_ACCESS_TOKEN ?? "",
  tiktokShopCipher: process.env.TIKTOK_SHOP_CIPHER ?? "",
  tiktokApiVersion: process.env.TIKTOK_API_VERSION ?? "202405",
  tiktokShopRegion: process.env.TIKTOK_SHOP_REGION ?? "US",
  tiktokShopProvider:
    process.env.TIKTOK_SHOP_PROVIDER === "justoneapi" ? "justoneapi" : "scrapecreators",
  tiktokShopApiKey: process.env.TIKTOK_SHOP_API_KEY ?? "",
  tiktokShopApiBase: process.env.TIKTOK_SHOP_API_BASE ?? "",
  defaultRegion: (process.env.DEFAULT_REGION?.toUpperCase() ?? "US") as RegionCode,
  supportedRegions: parseSupportedRegions(
    process.env.SUPPORTED_REGIONS ?? "US,UK,EU,GLOBAL"
  ),
  /** Regions refreshed by trending ingest queue (all supported marketplaces by default). */
  ingestRegions: parseSupportedRegions(process.env.INGEST_REGIONS ?? "US,UK,EU,GLOBAL"),
  /** Delete platform cache rows older than this (default 90 days ≈ 3 months). */
  dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS ?? "90", 10),
  /** Run daily ingest inside the app process when a database is configured. */
  ingestSchedulerEnabled:
    process.env.INGEST_SCHEDULER_ENABLED !== "false" &&
    Boolean(process.env.DATABASE_URL?.trim()),
  /** Full intel/catalog ingest interval (hours). */
  ingestFullIntervalHours: parseInt(process.env.INGEST_FULL_INTERVAL_HOURS ?? "24", 10),
  /** Trending queue cycle interval (hours) — resumes after API hourly cap. */
  ingestTrendingIntervalHours: parseInt(process.env.INGEST_TRENDING_INTERVAL_HOURS ?? "1", 10),
  /** @deprecated Use INGEST_FULL_INTERVAL_HOURS */
  ingestIntervalHours: parseInt(
    process.env.INGEST_INTERVAL_HOURS ?? process.env.INGEST_FULL_INTERVAL_HOURS ?? "24",
    10
  ),
  ingestStartupDelayMinutes: parseInt(process.env.INGEST_STARTUP_DELAY_MINUTES ?? "5", 10),
  /** Max live marketplace searches per trending cycle (capped by hourly limit). */
  ingestLiveSearchBudget: parseInt(process.env.INGEST_LIVE_SEARCH_BUDGET ?? "60", 10),
  /** Hard cap on live searches per clock hour (e.g. provider 300/hr limits). */
  ingestHourlyLiveSearchBudget: parseInt(process.env.INGEST_HOURLY_LIVE_SEARCH_BUDGET ?? "300", 10),
  ingestTrendingMaxCategories: parseInt(process.env.INGEST_TRENDING_MAX_CATEGORIES ?? "14", 10),
  ingestTrendingQueriesDefault: parseInt(process.env.INGEST_TRENDING_QUERIES_DEFAULT ?? "3", 10),
  ingestTrendingQueriesPerCategory: parseInt(
    process.env.INGEST_TRENDING_QUERIES_PER_CATEGORY ?? "2",
    10
  ),
  trendingCacheTtlHours: parseInt(process.env.TRENDING_CACHE_TTL_HOURS ?? "24", 10),
  trendingMaxItems: parseInt(process.env.TRENDING_MAX_ITEMS ?? "200", 10),
  trendingMaxItemsCategory: parseInt(process.env.TRENDING_MAX_ITEMS_CATEGORY ?? "60", 10),
  searchCacheTtlHours: parseInt(process.env.SEARCH_CACHE_TTL_HOURS ?? "24", 10),
  offersCacheTtlHours: parseInt(process.env.OFFERS_CACHE_TTL_HOURS ?? "24", 10),
  ingestMode: process.env.INGEST_MODE !== "live_first",
  serpApiDailyCap: parseInt(process.env.SERPAPI_DAILY_CAP ?? "10", 10),
  /** @deprecated Use SERPER_WEEKLY_CAP per account; kept for legacy daily guard */
  serperDailyCap: parseInt(process.env.SERPER_DAILY_CAP ?? "100", 10),
  /** Serper free tier: 2,500 credits per account per week */
  serperWeeklyCap: parseInt(process.env.SERPER_WEEKLY_CAP ?? "2500", 10),
  /** Max Serper API calls per hourly ingest cycle (spread across endpoints) */
  serperIngestMaxPerCycle: parseInt(process.env.SERPER_INGEST_MAX_PER_CYCLE ?? "40", 10),
  justSerpDailyCap: parseInt(process.env.JUSTSERP_DAILY_CAP ?? "10", 10),
  /** Shoptera free tier — 300 searches/hour per IP */
  shopteraHourlyCap: parseInt(process.env.SHOPTERA_HOURLY_CAP ?? "300", 10),
  /** CJ points-based daily quota (free tier — tune to your CJ account level) */
  cjDailyPointsCap: parseInt(process.env.CJ_DAILY_POINTS_CAP ?? "200", 10),
  /** CJ free tier: 1 request/second */
  cjMinIntervalMs: parseInt(process.env.CJ_MIN_INTERVAL_MS ?? "1000", 10),
  /** RapidAPI — shared key for all marketplace APIs */
  rapidApiKey: process.env.RAPIDAPI_KEY?.trim() ?? "",
  rapidApiEnabled: process.env.RAPIDAPI_ENABLED !== "false",
  /** Real-Time Amazon Data — category list */
  rapidApiAmazonHost:
    process.env.RAPIDAPI_AMAZON_HOST?.trim() ?? "real-time-amazon-data.p.rapidapi.com",
  rapidApiAmazonEnabled: process.env.RAPIDAPI_AMAZON_ENABLED !== "false",
  rapidApiAmazonMonthlyCap: parseInt(process.env.RAPIDAPI_AMAZON_MONTHLY_CAP ?? "100", 10),
  /** Real-Time Product Search — /search + /deals */
  rapidApiProductSearchHost:
    process.env.RAPIDAPI_PRODUCT_SEARCH_HOST?.trim() ?? "real-time-product-search.p.rapidapi.com",
  rapidApiProductSearchEnabled: process.env.RAPIDAPI_PRODUCT_SEARCH_ENABLED !== "false",
  rapidApiProductSearchMonthlyCap: parseInt(
    process.env.RAPIDAPI_PRODUCT_SEARCH_MONTHLY_CAP ?? "100",
    10
  ),
  rapidApiProductSearchLimit: parseInt(process.env.RAPIDAPI_PRODUCT_SEARCH_LIMIT ?? "10", 10),
  /** Google Search (RapidAPI) — discovery URLs */
  rapidApiGoogleSearchHost:
    process.env.RAPIDAPI_GOOGLE_SEARCH_HOST?.trim() ?? "google-search116.p.rapidapi.com",
  rapidApiGoogleSearchEnabled: process.env.RAPIDAPI_GOOGLE_SEARCH_ENABLED !== "false",
  rapidApiGoogleSearchMonthlyCap: parseInt(
    process.env.RAPIDAPI_GOOGLE_SEARCH_MONTHLY_CAP ?? "1000",
    10
  ),
  /** Etsy API */
  rapidApiEtsyHost: process.env.RAPIDAPI_ETSY_HOST?.trim() ?? "etsy-api2.p.rapidapi.com",
  rapidApiEtsyEnabled: process.env.RAPIDAPI_ETSY_ENABLED !== "false",
  rapidApiEtsyMonthlyCap: parseInt(process.env.RAPIDAPI_ETSY_MONTHLY_CAP ?? "45", 10),
  /** Pangolinfo Amazon Scraper */
  rapidApiPangolinfoHost:
    process.env.RAPIDAPI_PANGOLINFO_HOST?.trim() ?? "pangolinfo-amazon-scraper-api.p.rapidapi.com",
  rapidApiPangolinfoEnabled: process.env.RAPIDAPI_PANGOLINFO_ENABLED !== "false",
  rapidApiPangolinfoMonthlyCap: parseInt(process.env.RAPIDAPI_PANGOLINFO_MONTHLY_CAP ?? "60", 10),
  /** Lazada DataHub — image search */
  rapidApiLazadaHost: process.env.RAPIDAPI_LAZADA_HOST?.trim() ?? "lazada-datahub.p.rapidapi.com",
  rapidApiLazadaEnabled: process.env.RAPIDAPI_LAZADA_ENABLED !== "false",
  rapidApiLazadaMonthlyCap: parseInt(process.env.RAPIDAPI_LAZADA_MONTHLY_CAP ?? "50", 10),
  /** Taobao DataHub — itemId utility */
  rapidApiTaobaoHost: process.env.RAPIDAPI_TAOBAO_HOST?.trim() ?? "taobao-datahub.p.rapidapi.com",
  rapidApiTaobaoEnabled: process.env.RAPIDAPI_TAOBAO_ENABLED !== "false",
  rapidApiTaobaoMonthlyCap: parseInt(process.env.RAPIDAPI_TAOBAO_MONTHLY_CAP ?? "50", 10),
  /** Alibaba API — health check on free tier */
  rapidApiAlibabaHost: process.env.RAPIDAPI_ALIBABA_HOST?.trim() ?? "alibaba-api2.p.rapidapi.com",
  rapidApiAlibabaEnabled: process.env.RAPIDAPI_ALIBABA_ENABLED !== "false",
  rapidApiAlibabaMonthlyCap: parseInt(process.env.RAPIDAPI_ALIBABA_MONTHLY_CAP ?? "50", 10),
  rapidApiEbayDataHost: process.env.RAPIDAPI_EBAY_DATA_HOST?.trim() ?? "ebay-data-api1.p.rapidapi.com",
  rapidApiEbayDataEnabled: process.env.RAPIDAPI_EBAY_DATA_ENABLED !== "false",
  rapidApiEbayDataMonthlyCap: parseInt(process.env.RAPIDAPI_EBAY_DATA_MONTHLY_CAP ?? "100", 10),
  rapidApiAxessoWalmartHost:
    process.env.RAPIDAPI_AXESSO_WALMART_HOST?.trim() ?? "axesso-walmart-data-service.p.rapidapi.com",
  rapidApiAxessoWalmartEnabled: process.env.RAPIDAPI_AXESSO_WALMART_ENABLED !== "false",
  rapidApiAxessoWalmartMonthlyCap: parseInt(process.env.RAPIDAPI_AXESSO_WALMART_MONTHLY_CAP ?? "50", 10),
  rapidApiAliExpressHost: process.env.RAPIDAPI_ALI_EXPRESS_HOST?.trim() ?? "ali-express1.p.rapidapi.com",
  rapidApiAliExpressEnabled: process.env.RAPIDAPI_ALI_EXPRESS_ENABLED !== "false",
  rapidApiAliExpressMonthlyCap: parseInt(process.env.RAPIDAPI_ALI_EXPRESS_MONTHLY_CAP ?? "600", 10),
  rapidApiAliExpressDailyCap: parseInt(process.env.RAPIDAPI_ALI_EXPRESS_DAILY_CAP ?? "20", 10),
  rapidApiAliexpressDatahubHost:
    process.env.RAPIDAPI_ALIEXPRESS_DATAHUB_HOST?.trim() ?? "aliexpress-datahub.p.rapidapi.com",
  rapidApiAliexpressDatahubEnabled: process.env.RAPIDAPI_ALIEXPRESS_DATAHUB_ENABLED !== "false",
  rapidApiAliexpressDatahubMonthlyCap: parseInt(
    process.env.RAPIDAPI_ALIEXPRESS_DATAHUB_MONTHLY_CAP ?? "100",
    10
  ),
  rapidApiWebSearchHost:
    process.env.RAPIDAPI_WEB_SEARCH_HOST?.trim() ?? "real-time-web-search.p.rapidapi.com",
  rapidApiWebSearchEnabled: process.env.RAPIDAPI_WEB_SEARCH_ENABLED !== "false",
  rapidApiWebSearchMonthlyCap: parseInt(process.env.RAPIDAPI_WEB_SEARCH_MONTHLY_CAP ?? "100", 10),
  rapidApiNewsDataHost:
    process.env.RAPIDAPI_NEWS_DATA_HOST?.trim() ?? "real-time-news-data.p.rapidapi.com",
  rapidApiNewsDataEnabled: process.env.RAPIDAPI_NEWS_DATA_ENABLED !== "false",
  rapidApiNewsDataMonthlyCap: parseInt(process.env.RAPIDAPI_NEWS_DATA_MONTHLY_CAP ?? "100", 10),
  rapidApiNewsApiHost: process.env.RAPIDAPI_NEWS_API_HOST?.trim() ?? "news-api14.p.rapidapi.com",
  rapidApiNewsApiEnabled: process.env.RAPIDAPI_NEWS_API_ENABLED !== "false",
  rapidApiNewsApiMonthlyCap: parseInt(process.env.RAPIDAPI_NEWS_API_MONTHLY_CAP ?? "1000", 10),
  /** Max RapidAPI calls per daily ingest cycle. 0 = per-provider budgets only (recommended). */
  rapidApiIngestMaxPerCycle: parseInt(process.env.RAPIDAPI_INGEST_MAX_PER_CYCLE ?? "0", 10),
  metaAdsDailyCap: parseInt(process.env.META_ADS_DAILY_CAP ?? "15", 10),
  discoveryQueueMaxPerRun: parseInt(process.env.DISCOVERY_QUEUE_MAX_PER_RUN ?? "15", 10),
  discoveryQueuePriorityMin: parseFloat(process.env.DISCOVERY_QUEUE_PRIORITY_MIN ?? "0.4"),
  rankingVersion:
    process.env.RANKING_VERSION === "v1"
      ? "v1"
      : process.env.RANKING_VERSION === "v2"
        ? "v2"
        : process.env.RANKING_VERSION === "v3"
          ? "v3"
          : "v3",
  healthProbeExternal: process.env.HEALTH_PROBE_EXTERNAL === "true",
  liveSearchRequiresCredits: process.env.LIVE_SEARCH_REQUIRES_CREDITS !== "false",
  metaAccessToken: process.env.META_ACCESS_TOKEN ?? "",
  ingestSecret: process.env.INGEST_SECRET ?? "",
  cjApiKey: process.env.CJ_API_KEY ?? "",
  cjApiBase:
    process.env.CJ_API_BASE?.replace(/\/$/, "") ??
    "https://developers.cjdropshipping.com/api2.0/v1",
  cjDefaultWarehouse: process.env.CJ_DEFAULT_WAREHOUSE ?? "US",
  aliexpressAppKey: process.env.ALIEXPRESS_APP_KEY ?? "",
  aliexpressAppSecret: process.env.ALIEXPRESS_APP_SECRET ?? "",
  aliexpressAccessToken: process.env.ALIEXPRESS_ACCESS_TOKEN ?? "",
  aliexpressShipFromDefault: process.env.ALIEXPRESS_SHIP_FROM_DEFAULT ?? "CN",
  ropeshipApiKey: process.env.ROPESHIP_API_KEY ?? "",
  ropeshipApiBase: process.env.ROPESHIP_API_BASE?.replace(/\/$/, "") ?? "",
  freeRetailEnabled: process.env.FREE_RETAIL_ENABLED === "true",
  /**
   * Tri-state strict truth override: true = force on, false = allow demo catalog,
   * unset = fall back to Admin → Settings → strict_truth_mode.
   */
  strictTruthMode: (() => {
    const raw = process.env.STRICT_TRUTH_MODE?.trim().toLowerCase();
    if (raw === "true") return true as const;
    if (raw === "false") return false as const;
    if (process.env.NODE_ENV === "production") return true as const;
    return undefined;
  })(),
  /** Off by default until Shoptera REST search path is confirmed (optional). */
  shopteraEnabled: process.env.SHOPTERA_ENABLED === "true",
  appUrl: process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000",
  redisUrl: process.env.REDIS_URL?.trim() ?? "",
  searchApiKey: process.env.SEARCHAPI_KEY?.trim() ?? "",
  tiktokAdsDailyCap: parseInt(process.env.TIKTOK_ADS_DAILY_CAP ?? "10", 10),
  resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
  emailFrom: process.env.EMAIL_FROM?.trim() ?? "DropHunter <alerts@drophunter.ai>",
  intelDigestEnabled: process.env.INTEL_DIGEST_ENABLED !== "false",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY?.trim() ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
  stripePriceStarter: process.env.STRIPE_PRICE_STARTER?.trim() ?? "",
  stripePricePro: process.env.STRIPE_PRICE_PRO?.trim() ?? "",
  stripePriceBusiness: process.env.STRIPE_PRICE_BUSINESS?.trim() ?? "",
  stripePriceAgency: process.env.STRIPE_PRICE_AGENCY?.trim() ?? "",
  stripePriceCredits50: process.env.STRIPE_PRICE_CREDITS_50?.trim() ?? "",
  stripePriceCredits100: process.env.STRIPE_PRICE_CREDITS_100?.trim() ?? "",
  stripePriceCredits250: process.env.STRIPE_PRICE_CREDITS_250?.trim() ?? "",
  sentryDsn: process.env.SENTRY_DSN?.trim() ?? "",
  betaMode: process.env.BETA_MODE === "true",
  betaInviteCode: process.env.BETA_INVITE_CODE?.trim() ?? "",
  passwordResetTestMode:
    process.env.PASSWORD_RESET_TEST_MODE === "true" && process.env.NODE_ENV !== "production",
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
};

export function isAiConfigured(): boolean {
  return Boolean(ENV.openaiApiKey);
}

export function isCjConfigured(): boolean {
  return Boolean(ENV.cjApiKey);
}

export function isAliExpressConfigured(): boolean {
  return Boolean(ENV.aliexpressAppKey && ENV.aliexpressAppSecret);
}
