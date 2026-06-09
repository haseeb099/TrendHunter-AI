import "dotenv/config";
import { ENV, isAiConfigured, isCjConfigured } from "../server/_core/env";
import { invokeLLMOrThrow } from "../server/_core/aiHelpers";
import { searchCjOffers } from "../server/suppliers/cj";
import { isSerpApiConfigured } from "../server/search/serpapi";
import { isTikTokConfigured } from "../server/search/tiktok";

async function main() {
  console.log("=== API configuration summary ===\n");
  console.log(`SerpAPI:     ${isSerpApiConfigured() ? "✓ configured" : "○ missing"}`);
  console.log(`TikTok:      ${isTikTokConfigured() ? "✓ configured" : "○ missing"} (${ENV.tiktokShopProvider})`);
  console.log(`AI (Groq):   ${isAiConfigured() ? "✓ configured" : "○ missing"} → ${ENV.openaiApiBase}`);
  console.log(`CJ:          ${isCjConfigured() ? "✓ configured" : "○ missing"}`);
  console.log(`Model:       ${ENV.openaiModel}\n`);

  if (isAiConfigured()) {
    console.log("=== AI smoke test ===");
    try {
      const r = await invokeLLMOrThrow({
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        maxTokens: 16,
      });
      console.log("✓ AI response:", String(r.choices[0]?.message?.content).trim());
    } catch (e) {
      console.error("✗ AI failed:", e instanceof Error ? e.message : e);
    }
    console.log();
  }

  if (isCjConfigured()) {
    console.log("=== CJ supplier test ===");
    const r = await searchCjOffers("wireless earbuds", "US");
    console.log(`${r.live ? "✓" : "○"} CJ live=${r.live} offers=${r.offers.length}`);
    if (r.error) console.log("  Note:", r.error);
    if (r.offers[0]) {
      console.log(`  Sample: ${r.offers[0].supplierPlatform} landed $${r.offers[0].landedCost.toFixed(2)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
