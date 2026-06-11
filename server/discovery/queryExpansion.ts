import { and, desc, eq, gte, sql } from "drizzle-orm";
import { discoveryQueue, trendSignals, userEvents, watchlistItems } from "../../drizzle/schema";
import type { RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { collectRisingQueriesForRegion } from "../intelligence/trends";
import { nounPhrasesFromQuery, SYNONYM_MAP } from "./synonyms";
import { createLogger } from "../_core/logger";
import { searchProductsLive } from "../search/liveSearch";
import { saveSearchSnapshot } from "../dataPlatform/snapshots";
import { persistListings } from "../dataPlatform/productGraph";
import type { SearchPlatform } from "../search/utils";
import { canUseProviderToday } from "../dataPlatform/apiUsage";

const log = createLogger("discovery");

export type DiscoverySource =
  | "rising_trend"
  | "meta_ad"
  | "tiktok_ad"
  | "user_search"
  | "watchlist"
  | "category_seed"
  | "adjacent";

export type DiscoveryQueryInput = {
  query: string;
  platform: string;
  region: RegionCode;
  priority: number;
  source: DiscoverySource;
  parentQuery?: string;
};

async function userSearchDemand(query: string, region: RegionCode): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.eventType, "search_query"),
        gte(userEvents.createdAt, since),
        sql`JSON_EXTRACT(${userEvents.metadata}, '$.query') = ${query}`,
        sql`JSON_EXTRACT(${userEvents.metadata}, '$.region') = ${region}`
      )
    );
  return Number(rows[0]?.count ?? 0);
}

async function watchlistAffinity(query: string, region: RegionCode): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(watchlistItems)
    .where(
      and(
        eq(watchlistItems.region, region),
        sql`LOWER(${watchlistItems.productTitle}) LIKE ${`%${query.toLowerCase()}%`}`
      )
    );
  const count = Number(rows[0]?.count ?? 0);
  return Math.min(1, count / 5);
}

export function computeQueryPriority(signals: {
  trendMomentum?: number;
  adVelocity?: number;
  userDemand?: number;
  watchlistAffinity?: number;
  categoryBoost?: number;
}): number {
  const momentum = (signals.trendMomentum ?? 0) / 100;
  const adVel = (signals.adVelocity ?? 0) / 100;
  const demand = Math.min(1, (signals.userDemand ?? 0) / 10);
  const watch = signals.watchlistAffinity ?? 0;
  const category = signals.categoryBoost ?? 0;

  return (
    0.35 * momentum +
    0.25 * adVel +
    0.2 * demand +
    0.1 * watch +
    0.1 * category
  );
}

function adjacentQueries(parent: string): string[] {
  const phrases = nounPhrasesFromQuery(parent);
  const variants: string[] = [];
  for (const phrase of phrases.slice(0, 3)) {
    variants.push(phrase);
    const syns = SYNONYM_MAP[phrase] ?? [];
    variants.push(...syns);
    if (phrase.endsWith("s")) variants.push(phrase.slice(0, -1));
    else variants.push(`${phrase}s`);
  }
  return Array.from(new Set(variants)).filter((q) => q.length >= 3 && q !== parent);
}

/** Build prioritized discovery queries for a region (used by daily ingest). */
export async function buildDiscoveryQueries(
  region: RegionCode,
  seeds: string[]
): Promise<DiscoveryQueryInput[]> {
  const queries: DiscoveryQueryInput[] = [];

  const rising = await collectRisingQueriesForRegion(region, 5);
  for (const query of rising) {
    queries.push({
      query: query.toLowerCase(),
      platform: "all",
      region,
      priority: computeQueryPriority({ trendMomentum: 75, categoryBoost: 0.2 }),
      source: "rising_trend",
    });
  }

  const db = await getDb();
  if (db) {
    const watches = await db
      .select({ title: watchlistItems.productTitle })
      .from(watchlistItems)
      .where(eq(watchlistItems.region, region))
      .limit(10);

    for (const w of watches) {
      const phrases = nounPhrasesFromQuery(w.title);
      const q = phrases[0] ?? w.title.split(" ").slice(0, 3).join(" ").toLowerCase();
      const affinity = await watchlistAffinity(q, region);
      queries.push({
        query: q,
        platform: "all",
        region,
        priority: computeQueryPriority({ watchlistAffinity: affinity, categoryBoost: 0.15 }),
        source: "watchlist",
      });
    }
  }

  for (const seed of seeds) {
    const demand = await userSearchDemand(seed, region);
    queries.push({
      query: seed.toLowerCase(),
      platform: "all",
      region,
      priority: computeQueryPriority({ userDemand: demand, categoryBoost: 0.1 }),
      source: "category_seed",
    });

    for (const adj of adjacentQueries(seed).slice(0, 2)) {
      queries.push({
        query: adj,
        platform: "all",
        region,
        priority: computeQueryPriority({ categoryBoost: 0.08 }) * 0.85,
        source: "adjacent",
        parentQuery: seed,
      });
    }
  }

  log.info("discovery_queries_built", { region, count: queries.length });
  return queries;
}

export async function getAdjacentQuerySuggestions(
  query: string,
  region: RegionCode,
  limit = 3
): Promise<string[]> {
  const db = await getDb();
  const adjacent = adjacentQueries(query);

  if (db) {
    const rising = await db
      .select({ risingQueries: trendSignals.risingQueries })
      .from(trendSignals)
      .where(eq(trendSignals.region, region))
      .limit(5);

    for (const row of rising) {
      const rq = row.risingQueries as string[] | null;
      if (rq) adjacent.push(...rq);
    }
  }

  return Array.from(new Set(adjacent)).slice(0, limit);
}

export async function enqueueDiscoveryQueries(regions: RegionCode[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let enqueued = 0;
  const seeds = ["wireless earbuds", "skincare serum", "led strip lights", "kitchen gadget"];

  for (const region of regions) {
    const queries = await buildDiscoveryQueries(region, seeds);
    for (const input of queries) {
      if (input.priority < ENV.discoveryQueuePriorityMin) continue;

      const existing = await db
        .select({ id: discoveryQueue.id })
        .from(discoveryQueue)
        .where(
          and(
            eq(discoveryQueue.query, input.query),
            eq(discoveryQueue.region, input.region),
            eq(discoveryQueue.status, "pending")
          )
        )
        .limit(1);
      if (existing.length > 0) continue;

      await db.insert(discoveryQueue).values({
        query: input.query,
        platform: input.platform,
        region: input.region,
        priority: Math.min(1, input.priority),
        source: input.source,
        parentQuery: input.parentQuery ?? null,
        status: "pending",
      });
      enqueued++;
    }
  }

  log.info("discovery_queries_enqueued", { enqueued });
  return enqueued;
}

async function pickProvidersForQuery(priority: number): Promise<boolean> {
  if (priority >= 0.7) {
    return canUseProviderToday("serpapi", ENV.serpApiDailyCap);
  }
  return true;
}

export async function processDiscoveryQueue(regions: RegionCode[]): Promise<{
  processed: number;
  errors: string[];
}> {
  const db = await getDb();
  const errors: string[] = [];
  let processed = 0;
  if (!db) return { processed: 0, errors: ["no db"] };

  const pending = await db
    .select()
    .from(discoveryQueue)
    .where(
      and(
        eq(discoveryQueue.status, "pending"),
        gte(discoveryQueue.priority, ENV.discoveryQueuePriorityMin)
      )
    )
    .orderBy(desc(discoveryQueue.priority))
    .limit(ENV.discoveryQueueMaxPerRun);

  for (const item of pending) {
    if (!regions.includes(item.region as RegionCode)) continue;

    try {
      await db
        .update(discoveryQueue)
        .set({ status: "running" })
        .where(eq(discoveryQueue.id, item.id));

      const usePaid = await pickProvidersForQuery(item.priority);
      if (!usePaid && item.priority < 0.6) {
        await db
          .update(discoveryQueue)
          .set({ status: "skipped", completedAt: new Date() })
          .where(eq(discoveryQueue.id, item.id));
        continue;
      }

      const live = await searchProductsLive(
        item.query,
        (item.platform as SearchPlatform) ?? "all",
        { region: item.region as RegionCode }
      );

      if (live.results.length > 0) {
        await saveSearchSnapshot(
          item.query,
          item.platform as SearchPlatform,
          item.region as RegionCode,
          live
        );
        await persistListings(live.results, item.region as RegionCode);
      }

      await db
        .update(discoveryQueue)
        .set({ status: "done", completedAt: new Date() })
        .where(eq(discoveryQueue.id, item.id));
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${item.query}: ${msg}`);
      await db
        .update(discoveryQueue)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(discoveryQueue.id, item.id));
    }
  }

  return { processed, errors };
}

export async function boostQueryPriorityFromEngagement(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { discoveryQueue } = await import("../../drizzle/schema");
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const clicks = await db
    .select({ metadata: userEvents.metadata })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.eventType, "product_click"),
        gte(userEvents.createdAt, since)
      )
    )
    .limit(100);

  for (const row of clicks) {
    const meta = row.metadata as { query?: string; region?: string } | null;
    if (!meta?.query || !meta.region) continue;
    await db
      .update(discoveryQueue)
      .set({ priority: sql`LEAST(1, ${discoveryQueue.priority} + 0.05)` })
      .where(
        and(
          eq(discoveryQueue.query, meta.query),
          eq(discoveryQueue.region, meta.region)
        )
      );
  }
}
