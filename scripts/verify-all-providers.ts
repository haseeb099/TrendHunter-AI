import "dotenv/config";
import { ENV, isCjConfigured } from "../server/_core/env";
import { isMetaAdLibraryConfigured, getAdLibrarySnapshot } from "../server/intelligence/adLibrary";
import { isRapidApiConfigured, getAllRapidApiUsage } from "../server/search/rapidApi";
import { getAllRapidApiProviderBudgets } from "../server/search/rapidApi/schedule";
import { isSerperConfigured, getSerperPoolStatus, serperPoolSummary } from "../server/search/serper";
import { isSerpApiConfigured } from "../server/search/serpapi";
import { isShopteraEnabled, searchShoptera } from "../server/search/shoptera";
import { searchCjOffers } from "../server/suppliers/cj";
import { getProviderBudgetSnapshot } from "../server/dataPlatform/providerBudget";

type Row = { name: string; configured: boolean; live?: boolean; detail?: string };

async function main() {
  console.log("=== Provider verification ===\n");
  const rows: Row[] = [];

  rows.push({
    name: "CJ Dropshipping",
    configured: isCjConfigured(),
  });
  if (isCjConfigured()) {
    const budget = await getProviderBudgetSnapshot("cj");
    const r = await searchCjOffers("wireless earbuds", "US");
    const budgetOk =
      budget.dailyCap == null || budget.dailyUsed < budget.dailyCap;
    rows[rows.length - 1]!.live = r.live;
    rows[rows.length - 1]!.detail = r.live
      ? `${r.offers.length} offers`
      : r.error ?? (budgetOk ? "no offers returned" : "daily budget exhausted");
    rows[rows.length - 1]!.detail += ` | daily ${budget.dailyUsed}/${budget.dailyCap ?? "∞"}`;
  }

  rows.push({
    name: "Meta Ad Library (Facebook)",
    configured: isMetaAdLibraryConfigured(),
  });
  if (isMetaAdLibraryConfigured()) {
    const snap = await getAdLibrarySnapshot("wireless earbuds", "US", { live: true });
    const cached = snap ?? (await getAdLibrarySnapshot("wireless earbuds", "US", { live: false }));
    rows[rows.length - 1]!.live = Boolean(snap?.isLive);
    if (snap?.isLive) {
      rows[rows.length - 1]!.detail = `${snap.activeAdCount} ads, ${snap.advertiserCount} advertisers (live)`;
    } else if (cached) {
      rows[rows.length - 1]!.detail = `cached ${cached.activeAdCount} ads (live failed — refresh META_ACCESS_TOKEN)`;
    } else {
      rows[rows.length - 1]!.detail =
        "live failed — token expired or missing ads_read permission; update META_ACCESS_TOKEN in Meta Developer Console";
    }
    const budget = await getProviderBudgetSnapshot("meta_ads");
    rows[rows.length - 1]!.detail += ` | daily ${budget.dailyUsed}/${ENV.metaAdsDailyCap}`;
  }

  rows.push({
    name: "Serper.dev",
    configured: isSerperConfigured(),
  });
  if (isSerperConfigured()) {
    const pool = await getSerperPoolStatus();
    const summary = serperPoolSummary(pool);
    rows[rows.length - 1]!.detail = `${summary.remaining}/${summary.totalCap} credits this week (${summary.activeAccounts}/${summary.accounts} accounts)`;
    rows[rows.length - 1]!.live = summary.remaining > 0;
  }

  rows.push({
    name: "SerpAPI",
    configured: isSerpApiConfigured(),
    detail: isSerpApiConfigured() ? `daily cap ${ENV.serpApiDailyCap}` : undefined,
  });

  rows.push({
    name: "Shoptera",
    configured: isShopteraEnabled(),
  });
  if (isShopteraEnabled()) {
    try {
      const results = await searchShoptera("desk lamp", "EU", { ingest: true });
      rows[rows.length - 1]!.live = results.length > 0;
      rows[rows.length - 1]!.detail =
        results.length > 0
          ? `${results.length} products`
          : "Shoptera API returned empty (service may be down — check https://shoptera.ai)";
    } catch (e) {
      rows[rows.length - 1]!.live = false;
      rows[rows.length - 1]!.detail = e instanceof Error ? e.message : String(e);
    }
  }

  rows.push({
    name: "RapidAPI pool",
    configured: isRapidApiConfigured(),
  });
  if (isRapidApiConfigured()) {
    const usage = await getAllRapidApiUsage();
    const budgets = await getAllRapidApiProviderBudgets();
    const active = budgets.filter((b) => b.canCall).length;
    rows[rows.length - 1]!.live = active > 0;
    rows[rows.length - 1]!.detail = `${active}/${budgets.length} providers have budget today`;
    const top = usage.slice(0, 3).map((u) => `${u.provider}:${u.used}/${u.cap}`);
    if (top.length) rows[rows.length - 1]!.detail += ` | ${top.join(", ")}`;
  }

  for (const row of rows) {
    const cfg = row.configured ? "✓" : "○";
    const live =
      row.live === undefined ? "" : row.live ? " LIVE ✓" : " LIVE ✗";
    console.log(`${cfg} ${row.name}${live}`);
    if (row.detail) console.log(`   ${row.detail}`);
  }

  const failed = rows.filter((r) => {
    if (!r.configured || r.live !== false) return false;
    if (r.detail?.includes("budget exhausted")) return false;
    if (r.name.includes("Meta") && r.detail?.includes("cached")) return false;
    if (r.name.includes("Shoptera")) return false;
    return true;
  });
  if (failed.length > 0) {
    console.log(`\n${failed.length} configured provider(s) failed live check.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll configured providers passed.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
