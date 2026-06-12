import { and, eq, lte } from "drizzle-orm";
import { ingestRetries } from "../../drizzle/schema";
import { getDb } from "../db";
import { searchProductsLive } from "../search/liveSearch";
import { saveSearchSnapshot } from "../dataPlatform/snapshots";
import type { RegionCode } from "@shared/searchTypes";

export async function enqueueIngestRetry(options: {
  provider: string;
  query?: string;
  platform?: string;
  region?: RegionCode;
  payload?: unknown;
  error: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const backoffMinutes = 15;
  await db.insert(ingestRetries).values({
    provider: options.provider,
    query: options.query ?? null,
    platform: options.platform ?? null,
    region: options.region ?? null,
    payload: options.payload ?? null,
    lastError: options.error,
    nextRetryAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
    status: "pending",
  });
}

export async function processIngestRetries(): Promise<{
  processed: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) return { processed: 0, errors: [] };

  let pending: (typeof ingestRetries.$inferSelect)[] = [];
  try {
    pending = await db
      .select()
      .from(ingestRetries)
      .where(
        and(
          eq(ingestRetries.status, "pending"),
          lte(ingestRetries.nextRetryAt, new Date())
        )
      )
      .limit(20);
  } catch (err) {
    console.warn("[ingestRetries] queue unavailable:", err);
    return {
      processed: 0,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }

  let processed = 0;
  const errors: string[] = [];

  for (const item of pending) {
    if (item.attempts >= item.maxAttempts) {
      await db
        .update(ingestRetries)
        .set({ status: "failed" })
        .where(eq(ingestRetries.id, item.id));
      continue;
    }

    await db
      .update(ingestRetries)
      .set({ status: "running", attempts: item.attempts + 1 })
      .where(eq(ingestRetries.id, item.id));

    try {
      if (item.query && item.region) {
        const live = await searchProductsLive(
          item.query,
          (item.platform ?? "all") as "all",
          { region: item.region as RegionCode }
        );
        if (live.results.length > 0) {
          await saveSearchSnapshot(
            item.query,
            item.platform ?? "all",
            item.region as RegionCode,
            live
          );
        }
      }
      await db
        .update(ingestRetries)
        .set({ status: "done" })
        .where(eq(ingestRetries.id, item.id));
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const backoff = Math.min(60, 15 * (item.attempts + 1));
      await db
        .update(ingestRetries)
        .set({
          status: "pending",
          lastError: msg,
          nextRetryAt: new Date(Date.now() + backoff * 60 * 1000),
        })
        .where(eq(ingestRetries.id, item.id));
      errors.push(msg);
    }
  }

  return { processed, errors };
}

export async function getIngestRetryStatus(): Promise<{
  pending: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, failed: 0 };
  const rows = await db.select().from(ingestRetries).limit(200);
  return {
    pending: rows.filter((r) => r.status === "pending").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
}
