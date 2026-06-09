import { ENV, isAiConfigured, isCjConfigured, isAliExpressConfigured } from "./env";
import { isEbayConfigured } from "../search/ebay";
import { isSerpApiConfigured } from "../search/serpapi";
import { isTikTokConfigured } from "../search/tiktok";
import { isFreeRetailEnabled } from "../search/freeRetail";
import { isShopteraEnabled } from "../search/shoptera";

export function validateEnvOnStartup(): void {
  if (ENV.isProduction) {
    if (!ENV.cookieSecret) {
      throw new Error("JWT_SECRET is required in production. See docs/API-ENV-SETUP.md");
    }
    if (!ENV.databaseUrl) {
      throw new Error("DATABASE_URL is required in production. See docs/API-ENV-SETUP.md");
    }
  }

  const warnings: string[] = [];

  if (isFreeRetailEnabled() || isShopteraEnabled()) {
    const free: string[] = [];
    if (isFreeRetailEnabled()) free.push("DummyJSON/FakeStore");
    if (isShopteraEnabled()) free.push("Shoptera");
    console.info(`[Env] Free search catalogs enabled: ${free.join(", ")}`);
  }
  if (!isEbayConfigured()) {
    warnings.push("EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not set — eBay search skipped until approved");
  }
  if (!isSerpApiConfigured()) {
    warnings.push("SERPAPI_KEY not set — Amazon/Google Shopping skipped (free catalogs still work)");
  }
  if (!isTikTokConfigured()) {
    warnings.push("TikTok Shop credentials not set — TikTok search uses demo fallback");
  }
  if (!isAiConfigured()) {
    warnings.push(
      "OPENAI_API_KEY / GROQ_API_KEY not set — AI features disabled (see docs/API-ENV-SETUP.md)"
    );
  }
  if (!isCjConfigured()) {
    warnings.push("CJ_API_KEY not set — CJ supplier offers use demo data");
  }
  if (!isAliExpressConfigured()) {
    warnings.push("ALIEXPRESS_APP_KEY not set — AliExpress offers use demo data");
  }
  if (ENV.isProduction && !ENV.s3Bucket) {
    warnings.push("S3_BUCKET not set — uploads use local disk (not ideal for production)");
  }

  for (const msg of warnings) {
    console.warn(`[Env] ${msg}`);
  }
}
