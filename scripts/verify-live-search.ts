import "dotenv/config";
import { searchProductsLive } from "../server/search/liveSearch";
import { getSearchProviderStatus } from "../server/search/index";
import type { SearchPlatform } from "../server/search/utils";
import type { RegionCode } from "../shared/searchTypes";

const query = process.argv[2] ?? "wireless earbuds";
const platform = (process.argv[3] ?? "all") as SearchPlatform;
const region = (process.argv[4] ?? "US") as RegionCode;

console.log("=== Live search provider status ===\n");
for (const provider of getSearchProviderStatus()) {
  console.log(`${provider.configured ? "✓" : "○"} ${provider.label}`);
}

console.log(`\n=== Live search "${query}" / ${platform} / ${region} ===\n`);

const result = await searchProductsLive(query, platform, { region });
console.log(`Mode: ${result.dataMode ?? "none"} | Sources: ${result.sources.join(", ") || "none"}`);
console.log(`Results: ${result.results.length}`);
if (result.warnings?.length) console.log(`Warnings: ${result.warnings.join("; ")}`);
for (const item of result.results.slice(0, 3)) {
  console.log(`- [${item.platform}] ${item.title}`);
}

process.exitCode = result.results.length === 0 ? 1 : 0;
