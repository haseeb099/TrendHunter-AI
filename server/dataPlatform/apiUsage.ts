import { and, eq, sql } from "drizzle-orm";
import { apiUsageDaily } from "../../drizzle/schema";
import { getDb } from "../db";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyApiUsage(provider: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select()
    .from(apiUsageDaily)
    .where(and(eq(apiUsageDaily.provider, provider), eq(apiUsageDaily.usageDate, todayKey())))
    .limit(1);

  return rows[0]?.callCount ?? 0;
}

export async function incrementDailyApiUsage(
  provider: string,
  count = 1
): Promise<number> {
  const db = await getDb();
  if (!db) return count;

  const date = todayKey();
  const existing = await db
    .select()
    .from(apiUsageDaily)
    .where(and(eq(apiUsageDaily.provider, provider), eq(apiUsageDaily.usageDate, date)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(apiUsageDaily).values({
      provider,
      usageDate: date,
      callCount: count,
    });
    return count;
  }

  await db
    .update(apiUsageDaily)
    .set({ callCount: sql`${apiUsageDaily.callCount} + ${count}` })
    .where(eq(apiUsageDaily.id, existing[0]!.id));

  return (existing[0]?.callCount ?? 0) + count;
}

export async function canUseProviderToday(
  provider: string,
  dailyCap: number
): Promise<boolean> {
  if (dailyCap <= 0) return false;
  const used = await getDailyApiUsage(provider);
  return used < dailyCap;
}
