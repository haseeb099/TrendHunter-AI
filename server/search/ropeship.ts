import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";

/** Integration point for secured Ropeship fulfillment/branding API — no fake data. */
export function isRopeshipSearchConfigured(): boolean {
  return Boolean(ENV.ropeshipApiKey);
}

export async function searchRopeship(
  _query: string,
  _region?: RegionCode,
  _options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isRopeshipSearchConfigured()) {
    return [];
  }

  // Ropeship product discovery is not wired yet; return empty until API contract is finalized.
  return [];
}
