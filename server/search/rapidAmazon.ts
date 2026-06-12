import type { RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import {
  canUseProviderThisMonth,
  getMonthlyApiUsage,
  incrementMonthlyApiUsage,
} from "../dataPlatform/apiUsageMonthly";
import { wrapProviderCall } from "../_core/providerHealth";

const PROVIDER = "rapidapi_amazon";

export type AmazonMarketplaceCategory = {
  id: string;
  name: string;
};

const REGION_COUNTRY: Record<RegionCode, string> = {
  US: "US",
  UK: "GB",
  EU: "DE",
  GLOBAL: "US",
};

export function isRapidAmazonConfigured(): boolean {
  return ENV.rapidApiEnabled && ENV.rapidApiAmazonEnabled && Boolean(ENV.rapidApiKey);
}

export function rapidAmazonCountryForRegion(region: RegionCode): string {
  return REGION_COUNTRY[region] ?? "US";
}

export async function getRapidAmazonMonthlyUsage(): Promise<{
  used: number;
  cap: number;
  monthKey: string;
}> {
  const used = await getMonthlyApiUsage(PROVIDER);
  return {
    used,
    cap: ENV.rapidApiAmazonMonthlyCap,
    monthKey: new Date().toISOString().slice(0, 7),
  };
}

/** GET /product-category-list — 1 credit per call. */
export async function fetchAmazonProductCategoryList(
  region: RegionCode
): Promise<AmazonMarketplaceCategory[]> {
  if (!isRapidAmazonConfigured()) return [];

  const canUse = await canUseProviderThisMonth(PROVIDER, ENV.rapidApiAmazonMonthlyCap);
  if (!canUse) {
    console.warn("[RapidAmazon] Monthly cap reached", ENV.rapidApiAmazonMonthlyCap);
    return [];
  }

  const country = rapidAmazonCountryForRegion(region);
  const url = new URL(`https://${ENV.rapidApiAmazonHost}/product-category-list`);
  url.searchParams.set("country", country);

  return wrapProviderCall(PROVIDER, async () => {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": ENV.rapidApiAmazonHost,
        "x-rapidapi-key": ENV.rapidApiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`RapidAPI Amazon failed (${response.status}): ${text.slice(0, 300)}`);
    }

    await incrementMonthlyApiUsage(PROVIDER);

    const body = (await response.json()) as {
      status?: string;
      data?: Array<{ id?: string; name?: string }>;
    };

    const items = body.data ?? [];
    return items
      .filter((c) => c.id && c.name && c.id !== "aps")
      .map((c) => ({ id: c.id!, name: c.name! }));
  });
}
