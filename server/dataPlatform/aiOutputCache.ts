import { createHash } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { aiOutputCache } from "../../drizzle/schema";
import { getDb } from "../db";

const DEFAULT_TTL_HOURS = 168;

export function buildAiCacheKey(feature: string, input: Record<string, unknown>): string {
  const normalized = JSON.stringify(input, Object.keys(input).sort());
  return createHash("sha256").update(`${feature}:${normalized}`).digest("hex").slice(0, 64);
}

export async function getCachedAiOutput<T>(
  feature: string,
  input: Record<string, unknown>
): Promise<T | null> {
  const db = await getDb();
  if (!db) return null;

  const cacheKey = buildAiCacheKey(feature, input);
  const now = new Date();
  const rows = await db
    .select()
    .from(aiOutputCache)
    .where(and(eq(aiOutputCache.cacheKey, cacheKey), gt(aiOutputCache.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return row.payload as T;
}

export async function setCachedAiOutput(
  feature: string,
  input: Record<string, unknown>,
  payload: unknown,
  ttlHours = DEFAULT_TTL_HOURS
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const cacheKey = buildAiCacheKey(feature, input);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await db
    .insert(aiOutputCache)
    .values({
      cacheKey,
      feature,
      payload,
      expiresAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        payload,
        expiresAt,
        createdAt: new Date(),
      },
    });
}

export async function withAiOutputCache<T extends Record<string, unknown>>(
  feature: string,
  input: Record<string, unknown>,
  generate: () => Promise<T>,
  ttlHours = DEFAULT_TTL_HOURS
): Promise<T & { fromCache?: boolean }> {
  const cached = await getCachedAiOutput<T>(feature, input);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const result = await generate();
  const { fromCache: _drop, ...toStore } = result as T & { fromCache?: boolean };
  await setCachedAiOutput(feature, input, toStore, ttlHours);
  return result;
}
