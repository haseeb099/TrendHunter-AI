import {
  canUseProviderToday,
  getDailyApiUsage,
  incrementDailyApiUsage,
} from "../../dataPlatform/apiUsage";
import {
  canUseProviderThisHour,
  getHourlyApiUsage,
  incrementHourlyApiUsage,
} from "../../dataPlatform/apiUsageHourly";
import {
  canUseProviderThisMonth,
  getMonthlyApiUsage,
  incrementMonthlyApiUsage,
} from "../../dataPlatform/apiUsageMonthly";
import { wrapProviderCall } from "../../_core/providerHealth";
import { ENV } from "../../_core/env";
import {
  getRapidApiProviderConfig,
  isRapidApiConfigured,
  type RapidApiProviderId,
} from "./caps";
import { getRapidApiRefreshPolicy } from "./refreshPolicy";

export type RapidApiUsage = {
  provider: RapidApiProviderId;
  used: number;
  cap: number;
  monthKey: string;
  dailyUsed?: number;
  dailyCap?: number;
  hourlyUsed?: number;
  hourlyCap?: number;
};

const lastCallAt = new Map<RapidApiProviderId, number>();

export async function getRapidApiUsage(provider: RapidApiProviderId): Promise<RapidApiUsage | null> {
  const config = getRapidApiProviderConfig(provider);
  const policy = getRapidApiRefreshPolicy(provider);
  if (!config) return null;
  const used = await getMonthlyApiUsage(provider);
  const dailyUsed = config.dailyCap ? await getDailyApiUsage(provider) : undefined;
  const hourlyUsed = policy ? await getHourlyApiUsage(provider) : undefined;
  return {
    provider,
    used,
    cap: config.monthlyCap,
    monthKey: new Date().toISOString().slice(0, 7),
    dailyUsed,
    dailyCap: config.dailyCap,
    hourlyUsed,
    hourlyCap: policy?.hourlyCap,
  };
}

export async function getAllRapidApiUsage(): Promise<RapidApiUsage[]> {
  const { getRapidApiProviderConfigs } = await import("./caps");
  const rows = await Promise.all(
    getRapidApiProviderConfigs().map((c) => getRapidApiUsage(c.id))
  );
  return rows.filter((r): r is RapidApiUsage => r != null);
}

type RapidApiRequestOptions = {
  provider: RapidApiProviderId;
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Skip monthly usage increment (e.g. probe) */
  skipUsage?: boolean;
};

export async function rapidApiRequest<T>(options: RapidApiRequestOptions): Promise<T | null> {
  if (!isRapidApiConfigured()) return null;

  const config = getRapidApiProviderConfig(options.provider);
  if (!config) return null;

  const policy = getRapidApiRefreshPolicy(config.id);

  if (policy?.minIntervalMs) {
    const last = lastCallAt.get(config.id) ?? 0;
    if (Date.now() - last < policy.minIntervalMs) {
      console.warn(`[RapidAPI] ${config.id} min interval (${policy.minIntervalMs}ms) not elapsed`);
      return null;
    }
  }

  if (policy?.hourlyCap) {
    const canHourly = await canUseProviderThisHour(config.id, policy.hourlyCap);
    if (!canHourly) {
      console.warn(`[RapidAPI] ${config.id} hourly cap reached (${policy.hourlyCap})`);
      return null;
    }
  }

  if (config.dailyCap) {
    const canDaily = await canUseProviderToday(config.id, config.dailyCap);
    if (!canDaily) {
      console.warn(`[RapidAPI] ${config.id} daily cap reached (${config.dailyCap})`);
      return null;
    }
  }

  const canUse = await canUseProviderThisMonth(config.id, config.monthlyCap);
  if (!canUse) {
    console.warn(`[RapidAPI] ${config.id} monthly cap reached (${config.monthlyCap})`);
    return null;
  }

  const url = new URL(`https://${config.host}${options.path.startsWith("/") ? options.path : `/${options.path}`}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return wrapProviderCall(config.id, async () => {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": config.host,
        "x-rapidapi-key": ENV.rapidApiKey,
      },
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${config.label} failed (${response.status}): ${text.slice(0, 300)}`);
    }

    if (!options.skipUsage) {
      lastCallAt.set(config.id, Date.now());
      await incrementMonthlyApiUsage(config.id);
      if (config.dailyCap) {
        await incrementDailyApiUsage(config.id);
      }
      if (policy?.hourlyCap) {
        await incrementHourlyApiUsage(config.id);
      }
    }

    return (await response.json()) as T;
  });
}
