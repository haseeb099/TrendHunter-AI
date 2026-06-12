import "dotenv/config";
import {
  isSerperConfigured,
  searchGoogleShoppingSerper,
  getSerperPoolStatus,
  serperPoolSummary,
} from "../server/search/serper";
import { getSerperApiKeys } from "../server/search/serperPool";
import { searchGoogleShopping } from "../server/search/serpapi";

async function main() {
  console.log("=== Serper.dev pool verification ===\n");

  const keys = getSerperApiKeys();
  console.log(`Accounts configured: ${keys.length}`);
  console.log(`Serper active: ${isSerperConfigured() ? "yes" : "no"}`);

  if (!isSerperConfigured()) {
    console.error("\nAdd SERPER_API_KEY and/or SERPER_API_KEYS=key1,key2,key3 to .env");
    process.exit(1);
  }

  const pool = await getSerperPoolStatus();
  const summary = serperPoolSummary(pool);
  console.log(`\nWeek ${summary.weekKey}: ${summary.totalUsed}/${summary.totalCap} used (${summary.remaining} remaining)`);
  console.log(`Active accounts: ${summary.activeAccounts}/${summary.accounts}`);
  pool.forEach((slot) => {
    console.log(
      `  #${slot.index + 1} ${slot.key}: ${slot.weeklyUsed}/${slot.weeklyCap}${slot.exhausted ? " EXHAUSTED" : ""}`
    );
  });

  console.log("\n--- Shopping test ---");
  try {
    const direct = await searchGoogleShoppingSerper("wireless earbuds", "US", { maxResults: 3 });
    console.log(`✓ ${direct.length} shopping products`);
    direct.forEach((p, i) => console.log(`  ${i + 1}. ${p.title?.slice(0, 60)} — $${p.price}`));
  } catch (err) {
    console.error("✗ Shopping failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("\n--- Fallback chain test ---");
  const chain = await searchGoogleShopping("desk lamp", "US", { maxResults: 2 });
  console.log(`✓ ${chain.length} via google_shopping chain`);

  const poolAfter = serperPoolSummary(await getSerperPoolStatus());
  console.log(`\nAfter test: ${poolAfter.totalUsed}/${poolAfter.totalCap} credits used this week`);
  console.log("\nSerper multi-key pool is working.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
