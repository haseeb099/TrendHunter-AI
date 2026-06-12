import type { RegionCode } from "@shared/searchTypes";

/** When a region snapshot is missing, try these regions in order. */
export const REGION_FALLBACK_CHAIN: Record<RegionCode, RegionCode[]> = {
  US: ["GLOBAL"],
  UK: ["EU", "GLOBAL", "US"],
  EU: ["UK", "GLOBAL", "US"],
  GLOBAL: ["US", "UK"],
};

export type SnapshotFallbackReason =
  | null
  | "category_from_general"
  | `region_${RegionCode}`
  | `region_${RegionCode}_general`;

export function fallbackWarning(reason: SnapshotFallbackReason): string | undefined {
  if (!reason) return undefined;
  if (reason === "category_from_general") {
    return "Showing general trending for this region filtered to your category — category snapshot still ingesting.";
  }
  if (reason.endsWith("_general")) {
    const region = reason.replace("region_", "").replace("_general", "") as RegionCode;
    return `No ${region} snapshot yet — showing ${region} general trending while ingest catches up.`;
  }
  const region = reason.replace("region_", "") as RegionCode;
  return `No local snapshot yet — showing ${region} trending until your region ingest completes (auto hourly).`;
}
