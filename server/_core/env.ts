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
  trendingCacheTtlHours: parseInt(process.env.TRENDING_CACHE_TTL_HOURS ?? "6", 10),
  trendingMaxItems: parseInt(process.env.TRENDING_MAX_ITEMS ?? "40", 10),
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
  stripeSecretKey: process.env.STRIPE_SECRET_KEY?.trim() ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
  stripePriceStarter: process.env.STRIPE_PRICE_STARTER?.trim() ?? "",
  stripePricePro: process.env.STRIPE_PRICE_PRO?.trim() ?? "",
  stripePriceBusiness: process.env.STRIPE_PRICE_BUSINESS?.trim() ?? "",
  stripePriceAgency: process.env.STRIPE_PRICE_AGENCY?.trim() ?? "",
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
