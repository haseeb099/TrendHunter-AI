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
  trendingCacheTtlHours: parseInt(process.env.TRENDING_CACHE_TTL_HOURS ?? "24", 10),
  trendingMaxItems: parseInt(process.env.TRENDING_MAX_ITEMS ?? "40", 10),
  searchCacheTtlHours: parseInt(process.env.SEARCH_CACHE_TTL_HOURS ?? "24", 10),
  offersCacheTtlHours: parseInt(process.env.OFFERS_CACHE_TTL_HOURS ?? "24", 10),
  ingestMode: process.env.INGEST_MODE !== "live_first",
  serpApiDailyCap: parseInt(process.env.SERPAPI_DAILY_CAP ?? "10", 10),
  justSerpDailyCap: parseInt(process.env.JUSTSERP_DAILY_CAP ?? "10", 10),
  metaAdsDailyCap: parseInt(process.env.META_ADS_DAILY_CAP ?? "15", 10),
  discoveryQueueMaxPerRun: parseInt(process.env.DISCOVERY_QUEUE_MAX_PER_RUN ?? "40", 10),
  discoveryQueuePriorityMin: parseFloat(process.env.DISCOVERY_QUEUE_PRIORITY_MIN ?? "0.4"),
  rankingVersion: process.env.RANKING_VERSION === "v1" ? "v1" : "v2",
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
  freeRetailEnabled: process.env.FREE_RETAIL_ENABLED !== "false",
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
