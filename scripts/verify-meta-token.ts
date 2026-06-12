import "dotenv/config";
import { ENV } from "../server/_core/env";
import { getAdLibrarySnapshot, isMetaAdLibraryConfigured } from "../server/intelligence/adLibrary";
import { getProviderBudgetSnapshot } from "../server/dataPlatform/providerBudget";

async function main() {
  console.log("=== Meta Ad Library token check ===\n");

  if (!isMetaAdLibraryConfigured()) {
    console.error("META_ACCESS_TOKEN is not set in .env");
    process.exit(1);
  }

  const budget = await getProviderBudgetSnapshot("meta_ads");
  console.log(`Daily usage: ${budget.dailyUsed}/${ENV.metaAdsDailyCap}`);

  const snap = await getAdLibrarySnapshot("wireless earbuds", "US", { live: true });
  if (!snap?.isLive) {
    console.error("\nLive fetch failed.");
    console.error("Check token has ads_read permission and Ad Library API access.");
    process.exit(1);
  }

  console.log("\n✓ Meta token is working");
  console.log(`  Active ads: ${snap.activeAdCount}`);
  console.log(`  Advertisers: ${snap.advertiserCount}`);
  console.log(`  Creatives returned: ${snap.creatives.length}`);
  if (snap.creatives[0]) {
    const c = snap.creatives[0];
    console.log(`  Sample: ${c.advertiserName} — ${(c.bodyText ?? c.ctaText ?? "").slice(0, 100)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
