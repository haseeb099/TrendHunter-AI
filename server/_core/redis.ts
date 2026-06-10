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

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
