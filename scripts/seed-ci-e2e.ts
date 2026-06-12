/**
 * Seed catalog_products for CI e2e (cache-first search on empty DB).
 * Requires FREE_RETAIL_ENABLED=true and STRICT_TRUTH_MODE=false (or DEMO_MODE=true).
 */
import "dotenv/config";
import { countCatalogProducts, ingestFreeCatalog } from "../server/dataPlatform/catalog";

async function main() {
  const seeded = await ingestFreeCatalog(["US"]);
  const total = await countCatalogProducts();
  console.log(`[seed-ci-e2e] ingested=${seeded} catalog_rows=${total}`);
  if (total === 0) {
    console.error("[seed-ci-e2e] No catalog rows — e2e search will fail");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[seed-ci-e2e] failed:", err);
  process.exit(1);
});
