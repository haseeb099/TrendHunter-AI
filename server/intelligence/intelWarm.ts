import { INTEL_SEED_KEYWORDS } from "@shared/intelSeedKeywords";
import type { RegionCode } from "@shared/searchTypes";
import { eq } from "drizzle-orm";
import { trendSignals } from "../../drizzle/schema";
import { getDb } from "../db";
import { createLogger } from "../_core/logger";
import { isTrendIntelConfigured } from "./providers";
import { ingestTrendKeywords } from "./trends";
import { ingestAdKeywords, isMetaAdLibraryConfigured } from "./adLibrary";
import { ingestTikTokAdKeywords, isTikTokAdsConfigured } from "./tiktokAds";

const log = createLogger("intel-warm");

const warmingRegions = new Set<string>();

export async function regionHasIntelCache(region: RegionCode): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: trendSignals.id })
    .from(trendSignals)
    .where(eq(trendSignals.region, region))
    .limit(1);
  return rows.length > 0;
}

export type IntelWarmResult = {
  region: RegionCode;
  trends: number;
  ads: number;
  tiktok: number;
  background?: boolean;
  skipped?: boolean;
};

export async function warmRegionIntelCache(
  region: RegionCode,
  options?: { background?: boolean; force?: boolean }
): Promise<IntelWarmResult> {
  const lockKey = region;
  if (warmingRegions.has(lockKey)) {
    return { region, trends: 0, ads: 0, tiktok: 0, skipped: true };
  }

  const run = async (): Promise<IntelWarmResult> => {
    warmingRegions.add(lockKey);
    try {
      const db = await getDb();
      if (!db) {
        return { region, trends: 0, ads: 0, tiktok: 0, skipped: true };
      }

      if (!options?.force && (await regionHasIntelCache(region))) {
        return { region, trends: 0, ads: 0, tiktok: 0, skipped: true };
      }

      let trends = 0;
      let ads = 0;
      let tiktok = 0;

      if (isTrendIntelConfigured()) {
        trends = await ingestTrendKeywords([...INTEL_SEED_KEYWORDS], region);
      }
      if (isMetaAdLibraryConfigured()) {
        // Offset seeds so Meta digest differs from Google Trends on first warm.
        const metaSeeds = [
          ...INTEL_SEED_KEYWORDS.slice(6),
          ...INTEL_SEED_KEYWORDS.slice(0, 6),
        ];
        ads = await ingestAdKeywords(metaSeeds, region);
      }
      if (isTikTokAdsConfigured()) {
        const tiktokSeeds = [
          ...INTEL_SEED_KEYWORDS.slice(12),
          ...INTEL_SEED_KEYWORDS.slice(0, 6),
        ];
        tiktok = await ingestTikTokAdKeywords(tiktokSeeds, region);
      }

      log.info("intel_warm_complete", { region, trends, ads, tiktok });
      return { region, trends, ads, tiktok };
    } catch (err) {
      log.error("intel_warm_failed", {
        region,
        error: err instanceof Error ? err.message : String(err),
      });
      return { region, trends: 0, ads: 0, tiktok: 0, skipped: true };
    } finally {
      warmingRegions.delete(lockKey);
    }
  };

  if (options?.background) {
    void run();
    return { region, trends: 0, ads: 0, tiktok: 0, background: true };
  }

  return run();
}

export async function warmAllSupportedRegions(options?: { background?: boolean }): Promise<void> {
  const { ENV } = await import("../_core/env");
  for (const region of ENV.supportedRegions) {
    await warmRegionIntelCache(region, options);
  }
}
