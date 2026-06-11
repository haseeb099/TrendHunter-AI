import { and, eq } from "drizzle-orm";
import { productFeatures } from "../../drizzle/schema";
import type { RegionCode } from "@shared/searchTypes";
import { getDb } from "../db";

const FEATURE_TTL_MS = 24 * 60 * 60 * 1000;

export type FeatureInput = {
  canonicalProductId: string;
  region: RegionCode;
  keyword?: string;
  momentumScore?: number;
  adSaturationScore?: number;
  tiktokPressureScore?: number;
  supplierScore?: number;
  competitionScore?: number;
  freshnessScore?: number;
};

export type ProductFeaturesWithStale = {
  id: number;
  canonicalProductId: string;
  region: string;
  keyword: string | null;
  momentumScore: number | null;
  adSaturationScore: number | null;
  tiktokPressureScore: number | null;
  supplierScore: number | null;
  competitionScore: number | null;
  freshnessScore: number | null;
  computedAt: Date;
  stale: boolean;
};

export async function getProductFeatures(
  canonicalProductId: string,
  region: RegionCode
): Promise<ProductFeaturesWithStale | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(productFeatures)
    .where(
      and(
        eq(productFeatures.canonicalProductId, canonicalProductId),
        eq(productFeatures.region, region)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    stale: Date.now() - row.computedAt.getTime() > FEATURE_TTL_MS,
  };
}

export async function upsertProductFeatures(input: FeatureInput): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getProductFeatures(input.canonicalProductId, input.region);

  if (existing) {
    await db
      .update(productFeatures)
      .set({
        keyword: input.keyword ?? existing.keyword,
        momentumScore: input.momentumScore ?? existing.momentumScore,
        adSaturationScore: input.adSaturationScore ?? existing.adSaturationScore,
        tiktokPressureScore: input.tiktokPressureScore ?? existing.tiktokPressureScore,
        supplierScore: input.supplierScore ?? existing.supplierScore,
        competitionScore: input.competitionScore ?? existing.competitionScore,
        freshnessScore: input.freshnessScore ?? existing.freshnessScore,
        computedAt: new Date(),
      })
      .where(eq(productFeatures.id, existing.id));
    return;
  }

  await db.insert(productFeatures).values({
    canonicalProductId: input.canonicalProductId,
    region: input.region,
    keyword: input.keyword ?? null,
    momentumScore: input.momentumScore ?? null,
    adSaturationScore: input.adSaturationScore ?? null,
    tiktokPressureScore: input.tiktokPressureScore ?? null,
    supplierScore: input.supplierScore ?? null,
    competitionScore: input.competitionScore ?? null,
    freshnessScore: input.freshnessScore ?? null,
    computedAt: new Date(),
  });
}

/** @alias upsertProductFeatures */
export const materializeProductFeatures = upsertProductFeatures;
