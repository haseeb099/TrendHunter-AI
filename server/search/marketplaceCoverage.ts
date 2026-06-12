import type { MarketplaceCoverage, SearchProviderStatus } from "@shared/searchTypes";
import { getOffersStatus } from "../suppliers";
import { getProviderState } from "../_core/providerHealth";
import { getSearchProviderDefinitions } from "./providerRegistry";

async function buildSearchProviderStatus(): Promise<SearchProviderStatus[]> {
  return Promise.all(
    getSearchProviderDefinitions().map(async (def) => {
      const state = await getProviderState(def.id);
      const baseNote = def.getNote?.() ?? def.note;
      return {
        id: def.id,
        label: def.label,
        configured: def.isConfigured(),
        platforms: def.platforms,
        tier: def.tier,
        degraded: state === "degraded" || state === "open",
        note:
          state === "open"
            ? `${baseNote ?? ""} (circuit open — using cache)`.trim()
            : state === "degraded"
              ? `${baseNote ?? ""} (degraded)`.trim()
              : baseNote,
      };
    })
  );
}

export async function getSearchProviderStatus(): Promise<SearchProviderStatus[]> {
  return buildSearchProviderStatus();
}

export async function getMarketplaceCoverage(): Promise<MarketplaceCoverage> {
  const search = await buildSearchProviderStatus();
  const offers = getOffersStatus();

  return {
    search,
    suppliers: [
      {
        id: "cj",
        label: "CJ Dropshipping",
        configured: offers.cj.configured,
        mode: offers.cj.configured ? "live" : "catalog",
        note: offers.cj.configured
          ? "Live product discovery + supplier offers"
          : "Catalog-only — set CJ_API_KEY for live search",
      },
      {
        id: "aliexpress",
        label: "AliExpress",
        configured: offers.aliexpress.configured,
        mode: offers.aliexpress.configured ? "live" : "catalog",
        note: offers.aliexpress.configured
          ? "Live affiliate product query + offers"
          : "Catalog-only — set ALIEXPRESS_APP_KEY + ALIEXPRESS_APP_SECRET",
      },
    ],
  };
}
