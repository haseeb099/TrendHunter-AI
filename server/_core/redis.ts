import Redis from "ioredis";
import { ENV } from "./env";

let client: Redis | null | undefined;

export function isRedisConfigured(): boolean {
  return Boolean(ENV.redisUrl?.trim());
}

/** Lazy singleton — returns null when REDIS_URL is unset (in-memory fallback). */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = ENV.redisUrl?.trim();
  if (!url) {
    client = null;
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      console.warn("[Redis]", err.message);
    });
    void client.connect().catch((err) => {
      console.warn("[Redis] connect failed — using in-memory rate limits:", err.message);
    });
  } catch (err) {
    console.warn("[Redis] init failed — using in-memory rate limits");
    client = null;
  }

  return client;
}

export async function pingRedis(): Promise<{
  configured: boolean;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!isRedisConfigured()) {
    return { configured: false, ok: true };
  }

  const redis = getRedis();
  if (!redis) {
    return { configured: true, ok: false, error: "init_failed" };
  }

  const start = Date.now();
  try {
    await redis.ping();
    return { configured: true, ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "ping_failed",
    };
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
