import { ENV } from "./_core/env";
import { getPlatformSettings } from "./planCatalog";

/** Explicit demo/staging flag — enables synthetic catalog and heuristic scores. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** When true: no free retail, no catalog fallback, no heuristic trend scores on listings. */
export async function getStrictTruthMode(): Promise<boolean> {
  if (isDemoMode()) return false;
  if (ENV.strictTruthMode === true) return true;
  if (ENV.strictTruthMode === false) return false;
  const settings = await getPlatformSettings();
  return settings.strict_truth_mode !== false;
}

/** Catalog seeding and searchCatalog fallback — only when demo or strict truth is off. */
export async function allowsSyntheticCatalog(): Promise<boolean> {
  if (isDemoMode()) return true;
  return !(await getStrictTruthMode());
}

export async function allowsHeuristicTrendScores(): Promise<boolean> {
  if (isDemoMode()) return true;
  return !(await getStrictTruthMode());
}

/** Free retail requires env flag AND not strict truth mode. */
export async function isFreeRetailAllowed(): Promise<boolean> {
  if (!ENV.freeRetailEnabled) return false;
  return !(await getStrictTruthMode());
}
