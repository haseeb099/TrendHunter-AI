import { and, desc, eq, isNull } from "drizzle-orm";
import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { trendingSnapshots, trendingSnapshotDiffs } from "../../drizzle/schema";
import { getDb } from "../db";
import { PRODUCT_CATEGORIES } from "@shared/searchTypes";

async function loadSnapshotPayload(id: number): Promise<ProductSearchResult[] | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ payload: trendingSnapshots.payload })
    .from(trendingSnapshots)
    .where(eq(trendingSnapshots.id, id))
    .limit(1);
  const payload = rows[0]?.payload;
  return Array.isArray(payload) ? (payload as ProductSearchResult[]) : null;
}

export async function computeSnapshotDiffs(
  regionOrRegions: RegionCode | RegionCode[]
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const regions = Array.isArray(regionOrRegions) ? regionOrRegions : [regionOrRegions];
  let count = 0;

  for (const region of regions) {
    for (const category of [undefined, ...PRODUCT_CATEGORIES]) {
      try {
        const categoryCond = category
          ? eq(trendingSnapshots.category, category)
          : isNull(trendingSnapshots.category);

        const metaRows = await db
          .select({
            id: trendingSnapshots.id,
          })
          .from(trendingSnapshots)
          .where(and(eq(trendingSnapshots.region, region), categoryCond))
          .orderBy(desc(trendingSnapshots.createdAt))
          .limit(2);

        if (metaRows.length < 2) continue;

        const [currentProducts, previousProducts] = await Promise.all([
          loadSnapshotPayload(metaRows[0]!.id),
          loadSnapshotPayload(metaRows[1]!.id),
        ]);

        if (!currentProducts?.length || !previousProducts?.length) continue;

        const prevIds = new Set(
          previousProducts.map((p) => p.canonicalProductId ?? `${p.platform}:${p.id}`)
        );
        const currIds = new Set(
          currentProducts.map((p) => p.canonicalProductId ?? `${p.platform}:${p.id}`)
        );

        const added = Array.from(currIds).filter((id) => !prevIds.has(id));
        const removed = Array.from(prevIds).filter((id) => !currIds.has(id));

        const scoreDeltas: Record<string, number> = {};
        for (const p of currentProducts) {
          const id = p.canonicalProductId ?? `${p.platform}:${p.id}`;
          const prev = previousProducts.find(
            (x) => (x.canonicalProductId ?? `${x.platform}:${x.id}`) === id
          );
          if (prev && p.trendScore != null && prev.trendScore != null) {
            scoreDeltas[id] = p.trendScore - prev.trendScore;
          }
        }

        await db.insert(trendingSnapshotDiffs).values({
          region,
          category: category ?? null,
          previousSnapshotId: metaRows[1]!.id,
          currentSnapshotId: metaRows[0]!.id,
          addedCanonicalIds: added,
          removedCanonicalIds: removed,
          scoreDeltas,
        });
        count++;
      } catch (err) {
        console.warn(`[snapshotDiff] skip ${region}/${category ?? "all"}:`, err);
      }
    }
  }

  return count;
}

export async function getProductDelta(
  canonicalProductId: string,
  region: RegionCode
): Promise<{
  added: boolean;
  removed: boolean;
  isNew: boolean;
  wasRemoved: boolean;
  scoreDelta?: number;
  createdAt?: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(trendingSnapshotDiffs)
    .where(eq(trendingSnapshotDiffs.region, region))
    .orderBy(desc(trendingSnapshotDiffs.createdAt))
    .limit(1);

  const diff = rows[0];
  if (!diff) return null;

  const added = ((diff.addedCanonicalIds as string[]) ?? []).includes(canonicalProductId);
  const removed = ((diff.removedCanonicalIds as string[]) ?? []).includes(canonicalProductId);
  const scoreDeltas = (diff.scoreDeltas as Record<string, number>) ?? {};

  return {
    added,
    removed,
    isNew: added,
    wasRemoved: removed,
    scoreDelta: scoreDeltas[canonicalProductId],
    createdAt: diff.createdAt.toISOString(),
  };
}
