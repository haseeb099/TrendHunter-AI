import "dotenv/config";
import {
  getAllRapidApiUsage,
  getRapidApiProviderConfigs,
  isRapidApiConfigured,
  searchRapidProducts,
  searchRapidGoogle,
  searchTikTokVideosByKeyword,
  fetchTikTokUserMediaFeed,
  isRapidTikTokApiConfigured,
  isRapidTikTokScraperConfigured,
} from "../server/search/rapidApi";

async function main() {
  console.log("=== RapidAPI provider pool ===\n");

  if (!isRapidApiConfigured()) {
    console.error("Set RAPIDAPI_KEY in .env");
    process.exit(1);
  }

  for (const p of getRapidApiProviderConfigs()) {
    console.log(`  ${p.label}: ${p.monthlyCap}/month (${p.host})`);
  }

  const usage = await getAllRapidApiUsage();
  console.log("\nMonthly usage:");
  for (const row of usage) {
    console.log(`  ${row.provider}: ${row.used}/${row.cap}`);
  }

  console.log("\n--- Product Search (limit=3) ---");
  const products = await searchRapidProducts("desk lamp", "US", { limit: 3 });
  console.log(`✓ ${products.length} products`);
  products.forEach((p, i) => console.log(`  ${i + 1}. ${p.title.slice(0, 50)} — $${p.price}`));

  console.log("\n--- Google discovery (max 3) ---");
  const google = await searchRapidGoogle("dropshipping products", "US", { maxResults: 3 });
  console.log(`✓ ${google.length} discovery URLs`);
  google.forEach((p, i) => console.log(`  ${i + 1}. ${p.title.slice(0, 50)}`));

  if (isRapidTikTokApiConfigured()) {
    console.log("\n--- Tiktok API (Tikfly) video search ---");
    const tiktok = await searchTikTokVideosByKeyword("wireless earbuds", { count: 3 });
    console.log(`✓ ${tiktok.length} TikTok videos`);
    tiktok.forEach((v, i) => console.log(`  ${i + 1}. @${v.author} — ${v.desc?.slice(0, 50) ?? "(no desc)"}`));
  }

  if (isRapidTikTokScraperConfigured()) {
    console.log("\n--- TikTok Scraper user feed ---");
    const feed = await fetchTikTokUserMediaFeed("khaby.lame", { count: 3 });
    console.log(`✓ ${feed.length} feed items (profile-only on some free tiers)`);
  }

  const after = await getAllRapidApiUsage();
  console.log("\nAfter test:");
  for (const row of after) {
    if (row.used > 0) console.log(`  ${row.provider}: ${row.used}/${row.cap}`);
  }

  console.log("\nRapidAPI ingest providers configured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
