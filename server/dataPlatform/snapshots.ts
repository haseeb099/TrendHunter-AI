import { and, desc, eq, gt, lt } from "drizzle-orm";
import type { ProductSearchResponse, RegionCode } from "@shared/searchTypes";
import { searchSnapshots } from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "../_core/env";

export async function getSearchSnapshot(
  query: string,
  platform: string,
  region: RegionCode,
  allowStale = true
): Promise<{
  response: ProductSearchResponse;
  cachedAt: Date;
  stale: boolean;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const rows = await db
    .select()
    .from(searchSnapshots)
    .where(
      and(
        eq(searchSnapshots.query, query.trim().toLowerCase()),
        eq(searchSnapshots.platform, platform),
        eq(searchSnapshots.region, region)
      )
    )
    .orderBy(desc(searchSnapshots.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const valid = row.expiresAt > now;
  if (!valid && !allowStale) return null;

  return {
    response: {
      results: row.payload as ProductSearchResponse["results"],
      sources: (row.sources as ProductSearchResponse["sources"]) ?? [],
      isDemo: row.isDemo,
      dataMode: valid ? "cached" : "cached",
      cachedAt: row.createdAt.toISOString(),
      stale: !valid,
    },
    cachedAt: row.createdAt,
    stale: !valid,
  };
}

export async function saveSearchSnapshot(
  query: string,
  platform: string,
  region: RegionCode,
  response: ProductSearchResponse
) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(
    Date.now() + ENV.searchCacheTtlHours * 60 * 60 * 1000
  );

  await db.insert(searchSnapshots).values({
    query: query.trim().toLowerCase(),
    platform,
    region,
    payload: response.results,
    sources: response.sources,
    isDemo: response.isDemo,
    expiresAt,
  });

  await db
    .delete(searchSnapshots)
    .where(lt(searchSnapshots.expiresAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
}
