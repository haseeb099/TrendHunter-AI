import { and, eq, sql } from "drizzle-orm";
import { apiUsageMonthly } from "../../drizzle/schema";
import { getDb } from "../db";

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function getMonthlyApiUsage(provider: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const rows = await db
      .select()
      .from(apiUsageMonthly)
      .where(
        and(eq(apiUsageMonthly.provider, provider), eq(apiUsageMonthly.monthKey, currentMonthKey()))
      )
      .limit(1);
    return rows[0]?.callCount ?? 0;
  } catch {
    return 0;
  }
}

export async function incrementMonthlyApiUsage(provider: string, count = 1): Promise<number> {
  const db = await getDb();
  if (!db) return count;

  const monthKey = currentMonthKey();
  try {
    const existing = await db
      .select()
      .from(apiUsageMonthly)
      .where(
        and(eq(apiUsageMonthly.provider, provider), eq(apiUsageMonthly.monthKey, monthKey))
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(apiUsageMonthly).values({ provider, monthKey, callCount: count });
      return count;
    }

    await db
      .update(apiUsageMonthly)
      .set({ callCount: sql`${apiUsageMonthly.callCount} + ${count}` })
      .where(eq(apiUsageMonthly.id, existing[0]!.id));

    return (existing[0]?.callCount ?? 0) + count;
  } catch {
    return count;
  }
}

export async function canUseProviderThisMonth(
  provider: string,
  monthlyCap: number
): Promise<boolean> {
  if (monthlyCap <= 0) return false;
  const used = await getMonthlyApiUsage(provider);
  return used < monthlyCap;
}
