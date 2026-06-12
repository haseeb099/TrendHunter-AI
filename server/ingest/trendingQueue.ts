import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { RegionCode } from "@shared/searchTypes";
import { PRODUCT_CATEGORIES } from "@shared/searchTypes";
import { trendingIngestQueue } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb, getValidTrendingSnapshot } from "../db";
import { createLogger } from "../_core/logger";
import { buildTrendingForRegion } from "./trendingRefresh";
import {
  consumeIngestLiveSearch,
  getIngestHourlyUsage,
  getIngestLiveBudgetRemaining,
} from "./liveBudget";

const log = createLogger("trending-queue");

const REGION_PRIORITY: Record<RegionCode, number> = {
  US: 10,
  UK: 9,
  EU: 8,
  GLOBAL: 7,
};

const CATEGORY_PRIORITY: Record<string, number> = {
  electronics: 9,
  beauty: 8,
  home: 8,
  fashion: 7,
  pet: 7,
  toys: 6,
};

export type TrendingQueueSlot = {
  region: RegionCode;
  category?: string;
};

export function allTrendingSlots(): TrendingQueueSlot[] {
  const slots: TrendingQueueSlot[] = [];
  for (const region of ENV.ingestRegions) {
    slots.push({ region });
    for (const cat of PRODUCT_CATEGORIES.slice(0, ENV.ingestTrendingMaxCategories)) {
      slots.push({ region, category: cat });
    }
  }
  return slots;
}

function slotPriority(region: RegionCode, category?: string): number {
  const base = REGION_PRIORITY[region] ?? 5;
  if (!category) return base + 5;
  return base + (CATEGORY_PRIORITY[category] ?? 4);
}

/** Ensure every region × category slot exists in the queue when snapshot is missing or stale. */
export async function seedTrendingIngestQueue(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let seeded = 0;
  for (const slot of allTrendingSlots()) {
    const valid = await getValidTrendingSnapshot(slot.region, slot.category);
    if (valid) continue;

    try {
      const existing = await db
        .select({ id: trendingIngestQueue.id, status: trendingIngestQueue.status })
        .from(trendingIngestQueue)
        .where(
          and(
            eq(trendingIngestQueue.region, slot.region),
            slot.category
              ? eq(trendingIngestQueue.category, slot.category)
              : isNull(trendingIngestQueue.category)
          )
        )
        .limit(1);

      const priority = slotPriority(slot.region, slot.category);

      if (existing.length === 0) {
        await db.insert(trendingIngestQueue).values({
          region: slot.region,
          category: slot.category ?? null,
          priority,
          status: "pending",
          nextRetryAt: new Date(),
        });
        seeded++;
      } else if (existing[0]!.status === "done") {
        await db
          .update(trendingIngestQueue)
          .set({
            status: "pending",
            priority,
            nextRetryAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(trendingIngestQueue.id, existing[0]!.id));
        seeded++;
      }
    } catch (err) {
      log.warn("seed_slot_failed", { slot, error: String(err) });
    }
  }

  return seeded;
}

async function claimNextSlot() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const rows = await db
    .select()
    .from(trendingIngestQueue)
    .where(
      and(
        or(eq(trendingIngestQueue.status, "pending"), eq(trendingIngestQueue.status, "failed")),
        lte(trendingIngestQueue.nextRetryAt, now)
      )
    )
    .orderBy(desc(trendingIngestQueue.priority), asc(trendingIngestQueue.nextRetryAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db
    .update(trendingIngestQueue)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(trendingIngestQueue.id, row.id));

  return row;
}

async function markSlotDone(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(trendingIngestQueue)
    .set({
      status: "done",
      completedAt: new Date(),
      updatedAt: new Date(),
      lastError: null,
    })
    .where(eq(trendingIngestQueue.id, id));
}

/** Re-queue without counting as a failure (hourly API cap). */
async function markSlotDeferred(id: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(trendingIngestQueue)
    .set({
      status: "pending",
      lastError: reason.slice(0, 2000),
      nextRetryAt: new Date(Date.now() + 55 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(trendingIngestQueue.id, id));
}

async function markSlotRetry(id: number, error: string, attempts: number) {
  const db = await getDb();
  if (!db) return;
  const backoffMinutes = Math.min(60, 15 * Math.max(1, attempts));
  await db
    .update(trendingIngestQueue)
    .set({
      status: attempts >= 5 ? "failed" : "pending",
      attempts: attempts + 1,
      lastError: error.slice(0, 2000),
      nextRetryAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(trendingIngestQueue.id, id));
}

/** Process queue until live-search budget (per-cycle + hourly cap) is exhausted. */
export async function processTrendingIngestQueue(): Promise<{
  processed: number;
  skipped: number;
  errors: string[];
  hourlyUsage: ReturnType<typeof getIngestHourlyUsage>;
}> {
  const errors: string[] = [];
  let processed = 0;
  let skipped = 0;

  while (getIngestLiveBudgetRemaining() > 0) {
    const slot = await claimNextSlot();
    if (!slot) break;

    const minQueries = slot.category
      ? ENV.ingestTrendingQueriesPerCategory
      : ENV.ingestTrendingQueriesDefault;

    if (getIngestLiveBudgetRemaining() < minQueries) {
      skipped++;
      await markSlotDeferred(slot.id, "Deferred: API budget — will retry next hour");
      break;
    }

    try {
      const saved = await buildTrendingForRegion(
        slot.region as RegionCode,
        slot.category ?? undefined
      );

      if (saved > 0) {
        await markSlotDone(slot.id);
        processed++;
        log.info("slot_complete", {
          region: slot.region,
          category: slot.category,
          products: saved,
        });
      } else {
        await markSlotRetry(
          slot.id,
          "No products returned — retry after cooldown",
          slot.attempts
        );
        errors.push(`${slot.region}/${slot.category ?? "all"}: empty`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markSlotRetry(slot.id, msg, slot.attempts);
      errors.push(`${slot.region}/${slot.category ?? "all"}: ${msg}`);
    }
  }

  return { processed, skipped, errors, hourlyUsage: getIngestHourlyUsage() };
}

export async function getTrendingQueueStats() {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select({
        status: trendingIngestQueue.status,
        count: sql<number>`count(*)`,
      })
      .from(trendingIngestQueue)
      .groupBy(trendingIngestQueue.status);
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  } catch {
    return null;
  }
}
