import { ENV, isAiConfigured, isCjConfigured, isAliExpressConfigured } from "./env";
import { isRedisConfigured } from "./redis";
import { isEbayConfigured } from "../search/ebay";
import { isSerpApiConfigured, isSerpConfigured } from "../search/serpapi";
import { isSerperConfigured } from "../search/serper";
import { isJustSerpConfigured } from "../search/justserp";
import { isTikTokConfigured } from "../search/tiktok";
import { isFreeRetailEnabled } from "../search/freeRetail";
import { isShopteraEnabled } from "../search/shoptera";
import { isRapidAmazonConfigured } from "../search/rapidAmazon";
import { getRapidApiProviderConfigs, isRapidApiConfigured } from "../search/rapidApi";
import { isStripeConfigured } from "../stripe";

const PRODUCTION_STRIPE_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PUBLISHABLE_KEY",
] as const;

export function validateEnvOnStartup(): void {
  if (ENV.isProduction) {
    if (!ENV.cookieSecret) {
      throw new Error("JWT_SECRET is required in production. See docs/API-ENV-SETUP.md");
    }
    if (!ENV.databaseUrl) {
      throw new Error("DATABASE_URL is required in production. See docs/API-ENV-SETUP.md");
    }
    if (!ENV.resendApiKey) {
      throw new Error("RESEND_API_KEY is required in production. See docs/API-ENV-SETUP.md");
    }

    const missingStripe = PRODUCTION_STRIPE_VARS.filter((key) => !process.env[key]?.trim());
    if (missingStripe.length > 0) {
      throw new Error(
        `Missing required Stripe env in production: ${missingStripe.join(", ")}. See docs/API-ENV-SETUP.md`
      );
    }
  }

  if (ENV.betaMode && !ENV.betaInviteCode) {
    throw new Error("BETA_INVITE_CODE is required when BETA_MODE=true");
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
  if (!isSerpConfigured()) {
    warnings.push(
      "SERPER_API_KEY / SERPAPI_KEY / JUSTSERP_API_KEY not set — Google Shopping/Amazon skipped (free catalogs still work)"
    );
  } else if (isSerperConfigured() && !isSerpApiConfigured()) {
    const keyCount =
      (ENV.serperApiKey ? 1 : 0) +
      ENV.serperApiKeys.filter((k) => k !== ENV.serperApiKey).length;
    console.info(
      `[Env] Serper.dev pool: ${keyCount} account(s), ${ENV.serperWeeklyCap} credits/week each — rotates on cap`
    );
  } else if (!isSerpApiConfigured() && isJustSerpConfigured()) {
    console.info("[Env] Just Serp API configured — Google Shopping/Trends (no Amazon)");
  }
  if (isShopteraEnabled()) {
    console.info(
      `[Env] Shoptera free ingest enabled — ${ENV.shopteraHourlyCap} searches/hour (hourly scheduler)`
    );
  }
  if (isCjConfigured()) {
    console.info(
      `[Env] CJ free API ingest — ${ENV.cjDailyPointsCap} points/day, ${ENV.cjMinIntervalMs}ms between calls`
    );
  }
  if (isRapidApiConfigured()) {
    const providers = getRapidApiProviderConfigs();
    console.info(
      `[Env] RapidAPI — ${providers.length} providers, ${ENV.rapidApiIngestMaxPerCycle} calls/max daily cycle`
    );
    for (const p of providers) {
      console.info(`  · ${p.label}: ${p.monthlyCap}/month`);
    }
  } else if (isRapidAmazonConfigured()) {
    console.info(
      `[Env] RapidAPI Amazon categories — ${ENV.rapidApiAmazonMonthlyCap} requests/month`
    );
  }
  if (!isTikTokConfigured()) {
    warnings.push("TikTok Shop credentials not set — TikTok search unavailable");
  }
  if (!isAiConfigured()) {
    warnings.push(
      "OPENAI_API_KEY / GROQ_API_KEY not set — AI features disabled (see docs/API-ENV-SETUP.md)"
    );
  }
  if (!isCjConfigured()) {
    warnings.push("CJ_API_KEY not set — CJ supplier offers unavailable");
  }
  if (!isAliExpressConfigured()) {
    warnings.push("ALIEXPRESS_APP_KEY not set — AliExpress offers unavailable");
  }
  if (ENV.isProduction && !ENV.s3Bucket) {
    warnings.push("S3_BUCKET not set — uploads use local disk (not ideal for production)");
  }
  if (ENV.isProduction && !isRedisConfigured()) {
    warnings.push(
      "REDIS_URL not set — rate limits are per-instance only (set Upstash Redis for multi-instance deploys)"
    );
  }
  if (ENV.isProduction && !ENV.sentryDsn) {
    warnings.push("SENTRY_DSN not set — error monitoring disabled");
  }
  if (ENV.isProduction && !isStripeConfigured()) {
    warnings.push("Stripe keys incomplete — billing webhooks may fail");
  }

  for (const msg of warnings) {
    console.warn(`[Env] ${msg}`);
  }
}
