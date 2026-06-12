import { and, eq, sql } from "drizzle-orm";
import { apiUsageWeekly } from "../../drizzle/schema";
import { getDb } from "../db";

/** Monday UTC date YYYY-MM-DD — resets with Serper free-tier weekly credits. */
export function currentWeekKey(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + mondayOffset)
  );
  return monday.toISOString().slice(0, 10);
}

export async function getWeeklyApiUsage(provider: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const rows = await db
      .select()
      .from(apiUsageWeekly)
      .where(
        and(eq(apiUsageWeekly.provider, provider), eq(apiUsageWeekly.weekKey, currentWeekKey()))
      )
      .limit(1);
    return rows[0]?.callCount ?? 0;
  } catch {
    return 0;
  }
}

export async function incrementWeeklyApiUsage(provider: string, count = 1): Promise<number> {
  const db = await getDb();
  if (!db) return count;

  const weekKey = currentWeekKey();
  try {
    const existing = await db
      .select()
      .from(apiUsageWeekly)
      .where(
        and(eq(apiUsageWeekly.provider, provider), eq(apiUsageWeekly.weekKey, weekKey))
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(apiUsageWeekly).values({ provider, weekKey, callCount: count });
      return count;
    }

    await db
      .update(apiUsageWeekly)
      .set({ callCount: sql`${apiUsageWeekly.callCount} + ${count}` })
      .where(eq(apiUsageWeekly.id, existing[0]!.id));

    return (existing[0]?.callCount ?? 0) + count;
  } catch {
    return count;
  }
}

/** Force a key to its cap for the current week (e.g. after 429 from provider). */
export async function markWeeklyApiUsageAtCap(provider: string, cap: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const weekKey = currentWeekKey();
  const existing = await db
    .select()
    .from(apiUsageWeekly)
    .where(and(eq(apiUsageWeekly.provider, provider), eq(apiUsageWeekly.weekKey, weekKey)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(apiUsageWeekly).values({ provider, weekKey, callCount: cap });
    return;
  }

  if ((existing[0]?.callCount ?? 0) < cap) {
    await db
      .update(apiUsageWeekly)
      .set({ callCount: cap })
      .where(eq(apiUsageWeekly.id, existing[0]!.id));
  }
}
