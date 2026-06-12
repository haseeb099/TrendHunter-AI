import "dotenv/config";
import {
  fetchAmazonProductCategoryList,
  getRapidAmazonMonthlyUsage,
  isRapidAmazonConfigured,
} from "../server/search/rapidAmazon";

async function main() {
  console.log("=== RapidAPI Real-Time Amazon Data ===\n");

  if (!isRapidAmazonConfigured()) {
    console.error("Add RAPIDAPI_KEY to .env (RAPIDAPI_AMAZON_ENABLED defaults to true)");
    process.exit(1);
  }

  const usageBefore = await getRapidAmazonMonthlyUsage();
  console.log(
    `Monthly budget: ${usageBefore.used}/${usageBefore.cap} used (${usageBefore.monthKey})`
  );

  if (usageBefore.used >= usageBefore.cap) {
    console.error("\nMonthly cap reached — skipping live call to preserve quota.");
    process.exit(1);
  }

  console.log("\n--- Product Category List (US) ---");
  try {
    const categories = await fetchAmazonProductCategoryList("US");
    console.log(`✓ ${categories.length} categories`);
    categories.slice(0, 8).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (${c.id})`);
    });
    if (categories.length > 8) {
      console.log(`  … and ${categories.length - 8} more`);
    }
  } catch (err) {
    console.error("✗ Category list failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const usageAfter = await getRapidAmazonMonthlyUsage();
  console.log(`\nAfter test: ${usageAfter.used}/${usageAfter.cap} requests this month`);
  console.log("\nRapidAPI Amazon category endpoint is working.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
