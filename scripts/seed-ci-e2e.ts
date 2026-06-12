/**
 * Seed catalog_products for CI e2e (cache-first search on empty DB).
 */
import "dotenv/config";
import { countCatalogProducts, upsertCatalogProducts } from "../server/dataPlatform/catalog";

const FIXTURES = [
  {
    externalId: "ci-e2e-earbuds-1",
    source: "free_retail" as const,
    title: "Wireless Earbuds Pro CI Fixture",
    price: 29.99,
    platform: "amazon",
    image: "https://example.com/earbuds.jpg",
    rating: 4.5,
    category: "electronics",
    region: "US" as const,
    currency: "USD",
    sourceUrl: "https://example.com/products/wireless-earbuds",
  },
  {
    externalId: "ci-e2e-earbuds-2",
    source: "free_retail" as const,
    title: "Bluetooth Wireless Earbuds Sport",
    price: 19.99,
    platform: "ebay",
    image: "https://example.com/earbuds-2.jpg",
    rating: 4.2,
    category: "electronics",
    region: "US" as const,
    currency: "USD",
    sourceUrl: "https://example.com/products/bt-earbuds",
  },
];

async function main() {
  await upsertCatalogProducts(FIXTURES);
  const total = await countCatalogProducts();
  console.log(`[seed-ci-e2e] seeded=${FIXTURES.length} catalog_rows=${total}`);
  if (total === 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-ci-e2e] failed:", err);
    process.exit(1);
  });
