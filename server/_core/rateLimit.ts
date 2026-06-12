import type { Request } from "express";
import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";
import type { PlanId } from "@shared/plans";
import { getRedis } from "./redis";
import { resolveEffectivePlan, isAdmin } from "../plans";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const RATE_LIMIT_PREFIX = "rl:";

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
}

function assertInMemoryRateLimit(key: string, maxAttempts: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > maxAttempts) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please wait a few minutes and try again.",
    });
  }
}

async function assertRedisRateLimit(key: string, maxAttempts: number, windowMs: number): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    assertInMemoryRateLimit(key, maxAttempts, windowMs);
    return;
  }

  try {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    if (count > maxAttempts) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many attempts. Please wait a few minutes and try again.",
      });
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    console.warn("[RateLimit] Redis error — falling back to memory:", err);
    assertInMemoryRateLimit(key, maxAttempts, windowMs);
  }
}

/** Fixed-window rate limit — Redis when REDIS_URL is set, otherwise in-process. */
export async function assertRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<void> {
  await assertRedisRateLimit(key, maxAttempts, windowMs);
}

export async function assertAuthRateLimit(req: Request, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const ip = getClientIp(req);
  await assertRateLimit(`auth:ip:${ip}`, 30, 15 * 60 * 1000);
  await assertRateLimit(`auth:email:${normalizedEmail}`, 10, 15 * 60 * 1000);
}

const LIVE_SEARCH_HOURLY_LIMITS: Record<PlanId, number> = {
  trial: 20,
  starter: 10,
  pro: 50,
  business: 100,
  agency: 0,
};

/** Plan-tier hourly cap on live marketplace search (cached reads are unlimited). */
export async function assertLiveSearchHourlyLimit(user: User): Promise<void> {
  if (isAdmin(user)) return;

  const plan = resolveEffectivePlan(user).effectivePlanId;
  const maxPerHour = LIVE_SEARCH_HOURLY_LIMITS[plan];
  if (maxPerHour === 0) return;

  const key = `live-search:user:${user.id}`;
  try {
    await assertRateLimit(key, maxPerHour, 60 * 60 * 1000);
  } catch (err) {
    if (err instanceof TRPCError && err.code === "TOO_MANY_REQUESTS") {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Live search limit reached (${maxPerHour}/hour on your plan). Use cached results or upgrade.`,
      });
    }
    throw err;
  }
}
