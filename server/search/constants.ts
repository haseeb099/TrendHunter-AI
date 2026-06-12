import { ENV } from "../_core/env";

/** Per-page fetch size for provider pagination loops. */
export const PROVIDER_FETCH_LIMIT = 50;

/** Per-provider cap before merge/dedupe — dynamic based on active providers and trending max. */
export function computePerProviderCap(activeProviderCount: number, totalCap = ENV.trendingMaxItems): number {
  if (activeProviderCount <= 0) return PROVIDER_FETCH_LIMIT;
  return Math.max(PROVIDER_FETCH_LIMIT, Math.ceil(totalCap / activeProviderCount));
}
