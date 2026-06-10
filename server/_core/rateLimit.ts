import type { Request } from "express";
import { TRPCError } from "@trpc/server";
import { getRedis } from "./redis";

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
