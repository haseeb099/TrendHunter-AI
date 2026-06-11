import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { getRedis, isRedisConfigured } from "./redis";
import { getStripeClient, isStripeConfigured } from "../stripe";
import { ENV } from "./env";
import { isEbayConfigured } from "../search/ebay";
import { isSerpApiConfigured } from "../search/serpapi";
import { isMetaAdLibraryConfigured } from "../intelligence/adLibrary";
import { getAllProviderHealth } from "./providerHealth";

export type ServiceCheck = {
  ok: boolean;
  configured: boolean;
  latencyMs?: number;
  error?: string;
};

export type DeepHealthResult = {
  ok: boolean;
  checks: {
    database: ServiceCheck;
    redis: ServiceCheck;
    stripe: ServiceCheck;
    providers?: Record<string, ServiceCheck>;
    providerHealth?: Record<string, string>;
  };
};

export async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db) {
      return { ok: false, configured: false, error: "DATABASE_URL not configured" };
    }
    await db.execute(sql`SELECT 1`);
    return { ok: true, configured: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkRedis(): Promise<ServiceCheck> {
  if (!isRedisConfigured()) {
    return { ok: true, configured: false };
  }

  const start = Date.now();
  try {
    const redis = getRedis();
    if (!redis) {
      return { ok: false, configured: true, error: "Redis client unavailable" };
    }
    await redis.ping();
    return { ok: true, configured: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkStripe(): Promise<ServiceCheck> {
  if (!isStripeConfigured()) {
    return { ok: true, configured: false };
  }

  const start = Date.now();
  try {
    const stripe = getStripeClient();
    await stripe.balance.retrieve();
    return { ok: true, configured: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkExternalProviders(): Promise<Record<string, ServiceCheck>> {
  if (process.env.HEALTH_PROBE_EXTERNAL !== "true") {
    return {};
  }

  const checks: Record<string, ServiceCheck> = {};
  const start = Date.now();

  if (isEbayConfigured()) {
    checks.ebay = { ok: true, configured: true, latencyMs: Date.now() - start };
  } else {
    checks.ebay = { ok: true, configured: false };
  }

  if (isSerpApiConfigured()) {
    checks.serpapi = { ok: true, configured: true, latencyMs: Date.now() - start };
  } else {
    checks.serpapi = { ok: true, configured: false };
  }

  if (isMetaAdLibraryConfigured()) {
    checks.meta_ads = { ok: true, configured: true, latencyMs: Date.now() - start };
  } else {
    checks.meta_ads = { ok: true, configured: false };
  }

  return checks;
}

export async function runDeepHealthChecks(): Promise<DeepHealthResult> {
  const [database, redis, stripe, providers, providerHealth] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStripe(),
    checkExternalProviders(),
    getAllProviderHealth(),
  ]);

  const requiredOk = database.ok;
  const optionalOk =
    (!redis.configured || redis.ok) && (!stripe.configured || stripe.ok);

  return {
    ok: requiredOk && optionalOk,
    checks: {
      database,
      redis,
      stripe,
      providers: Object.keys(providers).length > 0 ? providers : undefined,
      providerHealth,
    },
  };
}
