import { ENV } from "../_core/env";
import {
  currentWeekKey,
  getWeeklyApiUsage,
  incrementWeeklyApiUsage,
  markWeeklyApiUsageAtCap,
} from "../dataPlatform/apiUsageWeekly";

export type SerperKeySlot = {
  index: number;
  key: string;
  weeklyUsed: number;
  weeklyCap: number;
  exhausted: boolean;
};

function providerId(index: number): string {
  return `serper#${index}`;
}

/** All configured Serper keys (SERPER_API_KEY + comma-separated SERPER_API_KEYS, deduped). */
export function getSerperApiKeys(): string[] {
  const keys = new Set<string>();
  if (ENV.serperApiKey) keys.add(ENV.serperApiKey);
  for (const k of ENV.serperApiKeys) {
    if (k) keys.add(k);
  }
  return Array.from(keys);
}

export function isSerperPoolConfigured(): boolean {
  return getSerperApiKeys().length > 0;
}

export async function getSerperPoolStatus(): Promise<SerperKeySlot[]> {
  const keys = getSerperApiKeys();
  const cap = ENV.serperWeeklyCap;
  const slots: SerperKeySlot[] = [];

  for (let i = 0; i < keys.length; i++) {
    const used = await getWeeklyApiUsage(providerId(i));
    slots.push({
      index: i,
      key: maskKey(keys[i]!),
      weeklyUsed: used,
      weeklyCap: cap,
      exhausted: used >= cap,
    });
  }

  return slots;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/** First key with remaining weekly credits. */
export async function resolveActiveSerperKey(): Promise<{ index: number; key: string } | null> {
  const keys = getSerperApiKeys();
  const cap = ENV.serperWeeklyCap;

  for (let i = 0; i < keys.length; i++) {
    const used = await getWeeklyApiUsage(providerId(i));
    if (used < cap) {
      return { index: i, key: keys[i]! };
    }
  }

  return null;
}

export async function canUseAnySerperKey(): Promise<boolean> {
  return (await resolveActiveSerperKey()) !== null;
}

export async function recordSerperKeyUsage(index: number, count = 1): Promise<void> {
  await incrementWeeklyApiUsage(providerId(index), count);
  await incrementWeeklyApiUsage("serper", count);
}

export async function markSerperKeyExhausted(index: number): Promise<void> {
  await markWeeklyApiUsageAtCap(providerId(index), ENV.serperWeeklyCap);
}

export function isSerperQuotaError(status: number, body: string): boolean {
  if (status === 402 || status === 429) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("credit") ||
    lower.includes("quota") ||
    lower.includes("limit") ||
    lower.includes("exhausted") ||
    lower.includes("insufficient")
  );
}

export function serperPoolSummary(slots: SerperKeySlot[]) {
  const totalCap = slots.reduce((s, k) => s + k.weeklyCap, 0);
  const totalUsed = slots.reduce((s, k) => s + k.weeklyUsed, 0);
  const active = slots.filter((s) => !s.exhausted).length;
  return {
    weekKey: currentWeekKey(),
    accounts: slots.length,
    activeAccounts: active,
    totalUsed,
    totalCap,
    remaining: Math.max(0, totalCap - totalUsed),
  };
}
