import { getDailyApiUsage } from "../../dataPlatform/apiUsage";
import {
  canUseProviderThisMonth,
  getMonthlyApiUsage,
} from "../../dataPlatform/apiUsageMonthly";
import { getHourlyApiUsage } from "../../dataPlatform/apiUsageHourly";
import { ENV } from "../../_core/env";
import { getRapidApiProviderConfig, type RapidApiProviderId } from "./caps";
import {
  getRapidApiRefreshPolicy,
  getRapidApiRefreshPolicies,
  type RapidApiRefreshPolicy,
} from "./refreshPolicy";

export type RapidApiProviderBudget = {
  provider: RapidApiProviderId;
  monthlyUsed: number;
  monthlyCap: number;
  monthlyRemaining: number;
  dailyUsed: number;
  dailyCap?: number;
  dailyRemaining?: number;
  hourlyUsed: number;
  hourlyCap: number;
  hourlyRemaining: number;
  /** Recommended calls for the current ingest cycle. */
  callsThisCycle: number;
  canCall: boolean;
  policy: RapidApiRefreshPolicy;
};

export function daysLeftInMonthUtc(now = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.max(1, lastDay - now.getUTCDate() + 1);
}

/**
 * Spread monthly quota evenly across remaining days so we don't exhaust early.
 * Also respects daily and hourly caps.
 */
export function computeCallsThisCycle(
  policy: RapidApiRefreshPolicy,
  usage: {
    monthlyUsed: number;
    dailyUsed: number;
    hourlyUsed: number;
  },
  daysLeft: number
): number {
  const monthlyRemaining = Math.max(0, policy.monthlyCap - usage.monthlyUsed);
  if (monthlyRemaining <= 0) return 0;

  const spreadDaily = Math.ceil(monthlyRemaining / daysLeft);

  let allowance = spreadDaily;

  if (policy.dailyCap != null && policy.dailyCap > 0) {
    const dailyRemaining = Math.max(0, policy.dailyCap - usage.dailyUsed);
    allowance = Math.min(allowance, dailyRemaining);
  }

  if (policy.hourlyCap > 0) {
    const hourlyRemaining = Math.max(0, policy.hourlyCap - usage.hourlyUsed);
    allowance = Math.min(allowance, hourlyRemaining);
  }

  return Math.max(0, allowance);
}

export async function getRapidApiProviderBudget(
  provider: RapidApiProviderId
): Promise<RapidApiProviderBudget | null> {
  const config = getRapidApiProviderConfig(provider);
  const policy = getRapidApiRefreshPolicy(provider);
  if (!config || !policy) return null;

  const [monthlyUsed, dailyUsed, hourlyUsed] = await Promise.all([
    getMonthlyApiUsage(provider),
    policy.dailyCap ? getDailyApiUsage(provider) : Promise.resolve(0),
    getHourlyApiUsage(provider),
  ]);

  const daysLeft = daysLeftInMonthUtc();
  const callsThisCycle = computeCallsThisCycle(policy, { monthlyUsed, dailyUsed, hourlyUsed }, daysLeft);

  const monthlyRemaining = Math.max(0, policy.monthlyCap - monthlyUsed);
  const dailyRemaining =
    policy.dailyCap != null ? Math.max(0, policy.dailyCap - dailyUsed) : undefined;
  const hourlyRemaining = Math.max(0, policy.hourlyCap - hourlyUsed);

  const canCall =
    callsThisCycle > 0 &&
    monthlyRemaining > 0 &&
    (dailyRemaining == null || dailyRemaining > 0) &&
    hourlyRemaining > 0 &&
    (await canUseProviderThisMonth(provider, policy.monthlyCap));

  return {
    provider,
    monthlyUsed,
    monthlyCap: policy.monthlyCap,
    monthlyRemaining,
    dailyUsed,
    dailyCap: policy.dailyCap,
    dailyRemaining,
    hourlyUsed,
    hourlyCap: policy.hourlyCap,
    hourlyRemaining,
    callsThisCycle,
    canCall,
    policy,
  };
}

export async function getAllRapidApiProviderBudgets(): Promise<RapidApiProviderBudget[]> {
  const policies = getRapidApiRefreshPolicies();
  const enabled = new Set(
    policies
      .map((p) => getRapidApiProviderConfig(p.id))
      .filter(Boolean)
      .map((c) => c!.id)
  );

  const budgets = await Promise.all(
    policies
      .filter((p) => enabled.has(p.id))
      .map((p) => getRapidApiProviderBudget(p.id))
  );

  return budgets
    .filter((b): b is RapidApiProviderBudget => b != null)
    .sort((a, b) => b.policy.ingestPriority - a.policy.ingestPriority);
}

/**
 * Apply optional global ceiling on total RapidAPI calls per ingest run.
 * 0 = no global cap (only per-provider budgets apply).
 */
export function applyGlobalIngestCeiling(
  budgets: RapidApiProviderBudget[]
): Map<RapidApiProviderId, number> {
  const ceiling = ENV.rapidApiIngestMaxPerCycle;
  const map = new Map<RapidApiProviderId, number>();

  let remaining = ceiling > 0 ? ceiling : Number.POSITIVE_INFINITY;

  for (const budget of budgets) {
    if (!budget.canCall) continue;
    const take = Math.min(budget.callsThisCycle, remaining);
    if (take > 0) {
      map.set(budget.provider, take);
      remaining -= take;
      if (remaining <= 0) break;
    }
  }

  return map;
}
