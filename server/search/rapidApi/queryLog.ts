import { and, eq, gte } from "drizzle-orm";
import { rapidApiQueryLog } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { currentMonthKey } from "../../dataPlatform/apiUsageMonthly";
import type { RapidApiProviderId } from "./caps";
import {
  getRapidApiRefreshPolicy,
  queryRefreshMs,
} from "./refreshPolicy";

export async function wasRapidQueryFetchedRecently(
  provider: RapidApiProviderId,
  queryKey: string,
  region: string
): Promise<boolean> {
  const policy = getRapidApiRefreshPolicy(provider);
  const minRefreshMs = policy ? queryRefreshMs(policy.queryRefreshPeriod) : queryRefreshMs("month");

  const db = await getDb();
  if (!db) return false;

  const cutoff = new Date(Date.now() - minRefreshMs);

  try {
    const rows = await db
      .select({ id: rapidApiQueryLog.id })
      .from(rapidApiQueryLog)
      .where(
        and(
          eq(rapidApiQueryLog.provider, provider),
          eq(rapidApiQueryLog.queryKey, queryKey.slice(0, 191)),
          eq(rapidApiQueryLog.region, region),
          gte(rapidApiQueryLog.fetchedAt, cutoff)
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** @deprecated Use wasRapidQueryFetchedRecently — refresh window is per-provider. */
export async function wasRapidQueryFetchedThisMonth(
  provider: RapidApiProviderId,
  queryKey: string,
  region: string
): Promise<boolean> {
  return wasRapidQueryFetchedRecently(provider, queryKey, region);
}

export async function recordRapidQueryFetch(
  provider: RapidApiProviderId,
  queryKey: string,
  region: string,
  resultCount: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const monthKey = currentMonthKey();
  const key = queryKey.slice(0, 191);

  try {
    const existing = await db
      .select({ id: rapidApiQueryLog.id })
      .from(rapidApiQueryLog)
      .where(
        and(
          eq(rapidApiQueryLog.provider, provider),
          eq(rapidApiQueryLog.queryKey, key),
          eq(rapidApiQueryLog.region, region),
          eq(rapidApiQueryLog.monthKey, monthKey)
        )
      )
      .limit(1);

    if (existing.length > 0) return;

    await db.insert(rapidApiQueryLog).values({
      provider,
      queryKey: key,
      region,
      monthKey,
      resultCount,
    });
  } catch {
    /* duplicate or table missing */
  }
}
