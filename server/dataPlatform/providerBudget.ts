import type { SearchProviderId } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { getDailyApiUsage, incrementDailyApiUsage } from "./apiUsage";
import {
  getHourlyApiUsage,
  incrementHourlyApiUsage,
} from "./apiUsageHourly";

export type ProviderTier = "free" | "paid";

export type ProviderBudgetRule = {
  tier: ProviderTier;
  /** Max calls per clock hour (e.g. Shoptera 300/hr). */
  hourlyCap?: number;
  /** Max calls per UTC day (e.g. SerpAPI daily cap, CJ points budget). */
  dailyCap?: number;
  /** Minimum ms between consecutive calls (e.g. CJ free tier 1 req/sec). */
  minIntervalMs?: number;
  /** When true, only ingest/scheduled jobs may call this provider. */
  ingestOnly?: boolean;
};

/** Free vs paid API limits — see docs/FREE-API-PROVIDERS.md */
export const PROVIDER_BUDGET_RULES: Record<string, ProviderBudgetRule> = {
  shoptera: {
    tier: "free",
    hourlyCap: ENV.shopteraHourlyCap,
    ingestOnly: true,
  },
  free_retail: {
    tier: "free",
    hourlyCap: 500,
    ingestOnly: true,
  },
  cj: {
    tier: "free",
    dailyCap: ENV.cjDailyPointsCap,
    minIntervalMs: ENV.cjMinIntervalMs,
  },
  meta_ads: {
    tier: "free",
    dailyCap: ENV.metaAdsDailyCap,
    ingestOnly: true,
  },
  serper: {
    tier: "paid",
    /** Per-account caps tracked in serperPool (SERPER_WEEKLY_CAP × key count). */
  },
  serper_web: { tier: "paid" },
  serper_images: { tier: "paid" },
  serper_news: { tier: "paid" },
  serpapi: {
    tier: "paid",
    dailyCap: ENV.serpApiDailyCap,
  },
  justserp: {
    tier: "paid",
    dailyCap: ENV.justSerpDailyCap,
  },
  ebay: { tier: "paid" },
  amazon: { tier: "paid", dailyCap: ENV.serpApiDailyCap },
  google_shopping: { tier: "paid" },
  tiktok: { tier: "paid" },
  aliexpress: { tier: "paid" },
  ropeship: { tier: "paid" },
  /** Monthly caps tracked in apiUsageMonthly — see server/search/rapidApi/ */
  rapidapi_amazon: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_product_search: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_google_search: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_etsy: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_pangolinfo: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_lazada: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_taobao: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_alibaba: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapid_product: { tier: "free", ingestOnly: true },
  rapid_google: { tier: "free", ingestOnly: true },
  rapid_etsy: { tier: "free", ingestOnly: true },
  rapid_amazon_scraper: { tier: "free", ingestOnly: true },
  rapid_lazada: { tier: "free", ingestOnly: true },
  rapid_amazon: { tier: "free", ingestOnly: true },
  rapidapi_ebay_data: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_axesso_walmart: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_ali_express: {
    tier: "free",
    ingestOnly: true,
    dailyCap: ENV.rapidApiAliExpressDailyCap,
    hourlyCap: 1000,
  },
  rapidapi_aliexpress_datahub: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_web_search: { tier: "free", ingestOnly: true, hourlyCap: 1000, minIntervalMs: 1000 },
  rapidapi_news_data: { tier: "free", ingestOnly: true, hourlyCap: 1000, minIntervalMs: 1000 },
  rapidapi_news_api: { tier: "free", ingestOnly: true, hourlyCap: 1000 },
  rapidapi_tiktok_scraper: { tier: "free", ingestOnly: true, hourlyCap: 1000, minIntervalMs: 1000 },
  rapidapi_tiktok_api: { tier: "free", ingestOnly: true, hourlyCap: 1000, minIntervalMs: 1000 },
  rapid_ebay: { tier: "free", ingestOnly: true },
  rapid_walmart: { tier: "free", ingestOnly: true },
  rapid_aliexpress: { tier: "free", ingestOnly: true },
  rapid_web: { tier: "free", ingestOnly: true },
  rapid_news: { tier: "free", ingestOnly: true },
  rapid_news_api: { tier: "free", ingestOnly: true },
};

const lastCallAt = new Map<string, number>();

function ruleFor(provider: string): ProviderBudgetRule | undefined {
  return PROVIDER_BUDGET_RULES[provider];
}

export function getProviderTier(provider: string): ProviderTier {
  return ruleFor(provider)?.tier ?? "paid";
}

export type ProviderBudgetSnapshot = {
  provider: string;
  tier: ProviderTier;
  hourlyUsed: number;
  hourlyCap?: number;
  dailyUsed: number;
  dailyCap?: number;
};

export async function getProviderBudgetSnapshot(provider: string): Promise<ProviderBudgetSnapshot> {
  const rule = ruleFor(provider);
  const [hourlyUsed, dailyUsed] = await Promise.all([
    getHourlyApiUsage(provider),
    getDailyApiUsage(provider),
  ]);
  return {
    provider,
    tier: rule?.tier ?? "paid",
    hourlyUsed,
    hourlyCap: rule?.hourlyCap,
    dailyUsed,
    dailyCap: rule?.dailyCap,
  };
}

export type ProviderBudgetContext = {
  /** Scheduled ingest / trending queue — allows ingest-only free providers. */
  ingest?: boolean;
};

/**
 * Returns false when hourly cap, daily cap, or min-interval throttle would be exceeded.
 * Does not record usage — call recordProviderApiCall after a successful request.
 */
export async function canUseProviderNow(
  provider: string,
  ctx?: ProviderBudgetContext
): Promise<boolean> {
  if (provider === "serper" || provider.startsWith("serper_")) {
    const { canUseAnySerperKey } = await import("../search/serperPool");
    return canUseAnySerperKey();
  }

  const rule = ruleFor(provider);
  if (!rule) return true;

  if (rule.ingestOnly && !ctx?.ingest) {
    return false;
  }

  if (rule.minIntervalMs) {
    const last = lastCallAt.get(provider) ?? 0;
    if (Date.now() - last < rule.minIntervalMs) {
      return false;
    }
  }

  if (rule.hourlyCap != null && rule.hourlyCap > 0) {
    const used = await getHourlyApiUsage(provider);
    if (used >= rule.hourlyCap) return false;
  }

  if (rule.dailyCap != null && rule.dailyCap > 0) {
    const used = await getDailyApiUsage(provider);
    if (used >= rule.dailyCap) return false;
  }

  return true;
}

export async function recordProviderApiCall(provider: string, count = 1): Promise<void> {
  lastCallAt.set(provider, Date.now());
  const rule = ruleFor(provider);
  if (rule?.hourlyCap) {
    await incrementHourlyApiUsage(provider, count);
  }
  if (rule?.dailyCap) {
    await incrementDailyApiUsage(provider, count);
  }
}

/** Throws when budget exhausted — use in provider fetch wrappers. */
export class ProviderBudgetExhaustedError extends Error {
  constructor(
    public readonly provider: string,
    message: string
  ) {
    super(message);
    this.name = "ProviderBudgetExhaustedError";
  }
}

export async function assertProviderBudget(
  provider: string,
  ctx?: ProviderBudgetContext
): Promise<void> {
  const ok = await canUseProviderNow(provider, ctx);
  if (!ok) {
    const snap = await getProviderBudgetSnapshot(provider);
    throw new ProviderBudgetExhaustedError(
      provider,
      `${provider} budget exhausted (hourly ${snap.hourlyUsed}/${snap.hourlyCap ?? "∞"}, daily ${snap.dailyUsed}/${snap.dailyCap ?? "∞"})`
    );
  }
}

/** Free providers first, then paid — for ingest scheduling. */
export function sortProvidersForIngest(ids: SearchProviderId[]): SearchProviderId[] {
  return [...ids].sort((a, b) => {
    const ta = getProviderTier(a) === "free" ? 0 : 1;
    const tb = getProviderTier(b) === "free" ? 0 : 1;
    return ta - tb;
  });
}
