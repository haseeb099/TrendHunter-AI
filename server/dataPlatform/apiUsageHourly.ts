import { and, eq, sql } from "drizzle-orm";
import { apiUsageHourly } from "../../drizzle/schema";
import { getDb } from "../db";

export function currentHourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

export async function getHourlyApiUsage(provider: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const rows = await db
      .select()
      .from(apiUsageHourly)
      .where(
        and(eq(apiUsageHourly.provider, provider), eq(apiUsageHourly.hourKey, currentHourKey()))
      )
      .limit(1);
    return rows[0]?.callCount ?? 0;
  } catch {
    return 0;
  }
}

export async function incrementHourlyApiUsage(provider: string, count = 1): Promise<number> {
  const db = await getDb();
  if (!db) return count;

  const hourKey = currentHourKey();
  try {
    const existing = await db
      .select()
      .from(apiUsageHourly)
      .where(
        and(eq(apiUsageHourly.provider, provider), eq(apiUsageHourly.hourKey, hourKey))
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(apiUsageHourly).values({ provider, hourKey, callCount: count });
      return count;
    }

    await db
      .update(apiUsageHourly)
      .set({ callCount: sql`${apiUsageHourly.callCount} + ${count}` })
      .where(eq(apiUsageHourly.id, existing[0]!.id));

    return (existing[0]?.callCount ?? 0) + count;
  } catch {
    return count;
  }
}

export async function canUseProviderThisHour(
  provider: string,
  hourlyCap: number
): Promise<boolean> {
  if (hourlyCap <= 0) return true;
  const used = await getHourlyApiUsage(provider);
  return used < hourlyCap;
}
