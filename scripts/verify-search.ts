import "dotenv/config";
import { searchProducts, getSearchProviderStatus } from "../server/search/index";
import type { SearchPlatform } from "../server/search/utils";
import type { RegionCode } from "../shared/searchTypes";

const query = process.argv[2] ?? "wireless earbuds";
const platform = (process.argv[3] ?? "all") as SearchPlatform;
const region = (process.argv[4] ?? "US") as RegionCode;

console.log("=== Search provider status ===\n");
for (const provider of getSearchProviderStatus()) {
  console.log(
    `${provider.configured ? "✓" : "○"} ${provider.label} (${provider.id}) — platforms: ${provider.platforms.join(", ")}`
  );
}

console.log(`\n=== Searching "${query}" on platform "${platform}" region "${region}" ===\n`);

try {
  const result = await searchProducts(query, platform, { region, sort: "price_asc" });
  console.log(`Has results: ${result.results.length > 0}`);
  console.log(`Sources: ${result.sources.join(", ")}`);
  console.log(`Results: ${result.results.length}`);
  if (result.warnings?.length) {
    console.log(`Warnings: ${result.warnings.join("; ")}`);
  }
  console.log();

  for (const item of result.results.slice(0, 5)) {
    const currency = item.currency ?? "USD";
    console.log(`- [${item.platform}] ${item.title}`);
    console.log(`  ${currency} ${item.price.toFixed(2)} | ${item.supplier ?? "—"} | region: ${item.region ?? "—"}`);
    if (item.sourceUrl) console.log(`  ${item.sourceUrl}`);
  }

  if (result.results.length > 5) {
    console.log(`\n... and ${result.results.length - 5} more`);
  }

  const ukResult = await searchProducts(query, platform, { region: "UK", sort: "price_asc" });
  const usCurrency = result.results[0]?.currency;
  const ukCurrency = ukResult.results[0]?.currency;
  console.log(`\n=== Region comparison ===`);
  console.log(`US currency sample: ${usCurrency ?? "n/a"}`);
  console.log(`UK currency sample: ${ukCurrency ?? "n/a"}`);

  if (result.results.length === 0) {
    console.warn("\nNo results — run `pnpm ingest:daily` or try live search.");
    process.exitCode = 1;
  } else {
    console.log("\nSearch returned cached/catalog results.");
  }
} catch (error) {
  console.error("Search failed:", error);
  process.exitCode = 1;
}
