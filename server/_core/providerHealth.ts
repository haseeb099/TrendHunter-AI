import { getRedis, isRedisConfigured } from "./redis";
import { createLogger } from "./logger";

const log = createLogger("providerHealth");

export type CircuitState = "healthy" | "degraded" | "open";

type CircuitRecord = {
  failures: number;
  lastFailure: number;
  state: CircuitState;
  openedAt?: number;
};

const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const HALF_OPEN_AFTER_MS = 10 * 60 * 1000;

const memoryCircuits = new Map<string, CircuitRecord>();

function circuitKey(provider: string): string {
  return `provider:circuit:${provider}`;
}

async function getCircuit(provider: string): Promise<CircuitRecord> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      if (redis) {
        const raw = await redis.get(circuitKey(provider));
        if (raw) return JSON.parse(raw) as CircuitRecord;
      }
    } catch {
      /* fall through to memory */
    }
  }
  return memoryCircuits.get(provider) ?? { failures: 0, lastFailure: 0, state: "healthy" };
}

async function setCircuit(provider: string, record: CircuitRecord): Promise<void> {
  memoryCircuits.set(provider, record);
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      if (redis) {
        await redis.set(circuitKey(provider), JSON.stringify(record), "EX", 3600);
      }
    } catch {
      /* memory fallback ok */
    }
  }
}

export async function getProviderState(provider: string): Promise<CircuitState> {
  const record = await getCircuit(provider);
  if (record.state === "open" && record.openedAt) {
    if (Date.now() - record.openedAt >= HALF_OPEN_AFTER_MS) {
      return "degraded";
    }
    return "open";
  }
  return record.state;
}

export async function recordProviderSuccess(provider: string): Promise<void> {
  await setCircuit(provider, { failures: 0, lastFailure: 0, state: "healthy" });
}

export async function recordProviderFailure(provider: string): Promise<CircuitState> {
  const record = await getCircuit(provider);
  const now = Date.now();

  if (record.lastFailure && now - record.lastFailure > FAILURE_WINDOW_MS) {
    record.failures = 0;
  }

  record.failures += 1;
  record.lastFailure = now;

  if (record.failures >= FAILURE_THRESHOLD) {
    record.state = "open";
    record.openedAt = now;
    log.warn("provider_circuit_open", { provider, failures: record.failures });
  } else if (record.failures >= 2) {
    record.state = "degraded";
  }

  await setCircuit(provider, record);
  return record.state;
}

export async function shouldSkipProvider(provider: string): Promise<boolean> {
  const state = await getProviderState(provider);
  return state === "open";
}

export async function getAllProviderHealth(): Promise<Record<string, CircuitState>> {
  const providers = ["ebay", "amazon", "google_shopping", "tiktok", "free_retail", "shoptera", "serpapi", "meta_ads"];
  const result: Record<string, CircuitState> = {};
  for (const p of providers) {
    result[p] = await getProviderState(p);
  }
  return result;
}

export async function wrapProviderCall<T>(
  provider: string,
  fn: () => Promise<T>
): Promise<T> {
  if (await shouldSkipProvider(provider)) {
    throw new Error(`Provider ${provider} circuit is open`);
  }
  try {
    const result = await fn();
    await recordProviderSuccess(provider);
    return result;
  } catch (err) {
    await recordProviderFailure(provider);
    throw err;
  }
}
