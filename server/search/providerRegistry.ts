import type {
  ProductCategory,
  RegionCode,
  SearchProviderId,
  SearchProviderTier,
} from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { isJustSerpConfigured } from "./justserp";
import { searchEbay, isEbayConfigured } from "./ebay";
import { searchAmazon, searchGoogleShopping, isSerpApiConfigured, isSerpConfigured } from "./serpapi";
import { searchTikTok, isTikTokConfigured } from "./tiktok";
import { searchAliExpress, isAliExpressSearchConfigured } from "./aliexpress";
import { searchCj, isCjSearchConfigured } from "./cj";
import { searchFreeRetail, isFreeRetailEnabled } from "./freeRetail";
import { searchShoptera, isShopteraEnabled } from "./shoptera";
import {
  isSerperConfigured,
  searchGoogleShoppingSerper,
  searchWebSerper,
  searchImagesSerper,
  searchNewsSerper,
} from "./serper";
import { searchRopeship, isRopeshipSearchConfigured } from "./ropeship";
import {
  isRapidProductSearchConfigured,
  searchRapidProducts,
  isRapidEtsyConfigured,
  searchRapidEtsy,
} from "./rapidApi";
import { CATEGORY_PROVIDER_ROUTING } from "./categories";
import type { SearchPlatform } from "./utils";

export type OffersPlatform = "cj" | "aliexpress";

export type ProviderUnavailableContext = {
  freeRetailBlocked?: boolean;
};

export type SearchProviderDefinition = {
  id: SearchProviderId;
  label: string;
  tier: SearchProviderTier;
  searchProviderId: SearchProviderId;
  offersPlatform?: OffersPlatform;
  platforms: SearchPlatform[];
  isConfigured: () => boolean;
  search: (query: string, region: RegionCode, maxResults: number) => Promise<unknown[]>;
  note?: string;
  getNote?: () => string;
  unavailableReason?: (
    configured: boolean,
    ctx?: ProviderUnavailableContext
  ) => string | undefined;
  categoryHints: ProductCategory[];
};

function categoryHintsForProvider(id: SearchProviderId): ProductCategory[] {
  const hints: ProductCategory[] = [];
  for (const [category, routing] of Object.entries(CATEGORY_PROVIDER_ROUTING)) {
    if (routing?.providers.some((provider) => provider === id)) {
      hints.push(category as ProductCategory);
    }
  }
  return hints;
}

function googleShoppingNote(): string {
  if (isSerpApiConfigured() && isJustSerpConfigured()) {
    return "SerpAPI + Just Serp fallback";
  }
  if (isJustSerpConfigured()) {
    return "Just Serp API (docs.justserpapi.com)";
  }
  return "SerpAPI key";
}

const PROVIDER_DEFINITIONS: SearchProviderDefinition[] = [
  {
    id: "ebay",
    label: "eBay Browse API",
    tier: "paid",
    searchProviderId: "ebay",
    platforms: ["all", "ebay"],
    isConfigured: isEbayConfigured,
    search: (query, region, maxResults) => searchEbay(query, region, { maxResults }),
    note: "Free sandbox after developer approval",
    unavailableReason: (configured) =>
      configured ? undefined : "EBAY_CLIENT_ID / EBAY_CLIENT_SECRET missing",
    categoryHints: categoryHintsForProvider("ebay"),
  },
  {
    id: "amazon",
    label: "SerpAPI Amazon",
    tier: "paid",
    searchProviderId: "amazon",
    platforms: ["all", "amazon"],
    isConfigured: isSerpApiConfigured,
    search: (query, region, maxResults) => searchAmazon(query, region, { maxResults }),
    note: "SerpAPI only — Just Serp has no Amazon engine",
    unavailableReason: (configured) =>
      configured ? undefined : "SERPAPI_KEY missing — Amazon unavailable",
    categoryHints: categoryHintsForProvider("amazon"),
  },
  {
    id: "google_shopping",
    label: "Google Shopping (SERP)",
    tier: "paid",
    searchProviderId: "google_shopping",
    platforms: ["all", "shopify"],
    isConfigured: isSerpConfigured,
    search: (query, region, maxResults) => searchGoogleShopping(query, region, { maxResults }),
    getNote: googleShoppingNote,
    unavailableReason: (configured) =>
      configured ? undefined : "SerpAPI, Serper, or Just Serp key missing",
    categoryHints: categoryHintsForProvider("google_shopping"),
  },
  {
    id: "serper",
    label: "Serper Shopping",
    tier: "paid",
    searchProviderId: "serper",
    platforms: ["all", "shopify"],
    isConfigured: isSerperConfigured,
    search: (query, region, maxResults) =>
      searchGoogleShoppingSerper(query, region, { maxResults }),
    note: "Google Shopping via Serper pool",
    unavailableReason: (configured) =>
      configured ? undefined : "SERPER_API_KEY or SERPER_API_KEYS missing",
    categoryHints: categoryHintsForProvider("google_shopping"),
  },
  {
    id: "serper_web",
    label: "Serper Web Search",
    tier: "paid",
    searchProviderId: "serper_web",
    platforms: ["all", "shopify"],
    isConfigured: isSerperConfigured,
    search: (query, region, maxResults) => searchWebSerper(query, region, { maxResults }),
    note: "Organic Google results — competitors & niches",
    unavailableReason: (configured) =>
      configured ? undefined : "SERPER_API_KEY or SERPER_API_KEYS missing",
    categoryHints: categoryHintsForProvider("google_shopping"),
  },
  {
    id: "serper_images",
    label: "Serper Images",
    tier: "paid",
    searchProviderId: "serper_images",
    platforms: ["all", "shopify"],
    isConfigured: isSerperConfigured,
    search: (query, region, maxResults) => searchImagesSerper(query, region, { maxResults }),
    note: "Product image discovery",
    unavailableReason: (configured) =>
      configured ? undefined : "SERPER_API_KEY or SERPER_API_KEYS missing",
    categoryHints: categoryHintsForProvider("google_shopping"),
  },
  {
    id: "serper_news",
    label: "Serper News",
    tier: "paid",
    searchProviderId: "serper_news",
    platforms: ["all"],
    isConfigured: isSerperConfigured,
    search: (query, region, maxResults) => searchNewsSerper(query, region, { maxResults }),
    note: "News trend signals",
    unavailableReason: (configured) =>
      configured ? undefined : "SERPER_API_KEY or SERPER_API_KEYS missing",
    categoryHints: categoryHintsForProvider("google_shopping"),
  },
  {
    id: "free_retail",
    label: "Free retail catalogs",
    tier: "free",
    searchProviderId: "free_retail",
    platforms: ["all", "shopify"],
    isConfigured: isFreeRetailEnabled,
    search: (query, region) => searchFreeRetail(query, region),
    note: "DummyJSON + FakeStore — disabled by default in production",
    unavailableReason: (configured, ctx) => {
      if (ctx?.freeRetailBlocked) return "Free retail disabled in strict truth mode";
      if (!ENV.freeRetailEnabled) return "FREE_RETAIL_ENABLED is false";
      return configured ? undefined : "Free retail not available";
    },
    categoryHints: categoryHintsForProvider("free_retail"),
  },
  {
    id: "shoptera",
    label: "Shoptera EU catalog",
    tier: "free",
    searchProviderId: "shoptera",
    platforms: ["all", "shopify"],
    isConfigured: isShopteraEnabled,
    search: (query, region) => searchShoptera(query, region),
    note: "300 searches/hour, no signup",
    unavailableReason: (configured) =>
      configured ? undefined : "SHOPTERA_ENABLED is false",
    categoryHints: categoryHintsForProvider("shoptera"),
  },
  {
    id: "aliexpress",
    label: "AliExpress Affiliate",
    tier: "paid",
    searchProviderId: "aliexpress",
    offersPlatform: "aliexpress",
    platforms: ["all", "aliexpress"],
    isConfigured: isAliExpressSearchConfigured,
    search: (query, region, maxResults) => searchAliExpress(query, region, { maxResults }),
    note: "Affiliate product query API",
    unavailableReason: (configured) =>
      configured ? undefined : "ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET missing",
    categoryHints: categoryHintsForProvider("aliexpress"),
  },
  {
    id: "cj",
    label: "CJ Dropshipping",
    tier: "free",
    searchProviderId: "cj",
    offersPlatform: "cj",
    platforms: ["all", "cj"],
    isConfigured: isCjSearchConfigured,
    search: (query, region, maxResults) => searchCj(query, region, { maxResults }),
    note: "Free CJ API — 1 req/s, points-based daily quota (ingest only)",
    unavailableReason: (configured) =>
      configured ? undefined : "CJ_API_KEY missing",
    categoryHints: categoryHintsForProvider("cj"),
  },
  {
    id: "ropeship",
    label: "Ropeship",
    tier: "paid",
    searchProviderId: "ropeship",
    platforms: ["all"],
    isConfigured: isRopeshipSearchConfigured,
    search: (query, region, maxResults) => searchRopeship(query, region, { maxResults }),
    note: "Integration point for secured Ropeship fulfillment/branding API",
    unavailableReason: (configured) =>
      configured ? undefined : "ROPESHIP_API_KEY missing",
    categoryHints: [],
  },
  {
    id: "rapid_product",
    label: "RapidAPI Product Search",
    tier: "free",
    searchProviderId: "rapid_product",
    platforms: ["all", "shopify", "amazon"],
    isConfigured: isRapidProductSearchConfigured,
    search: (query, region, maxResults) =>
      searchRapidProducts(query, region, { limit: Math.min(maxResults, 10) }),
    note: "Real-Time Product Search — ingest only, 100 req/month",
    unavailableReason: (configured) =>
      configured ? undefined : "RAPIDAPI_KEY missing or product search disabled",
    categoryHints: categoryHintsForProvider("google_shopping"),
  },
  {
    id: "rapid_etsy",
    label: "RapidAPI Etsy",
    tier: "free",
    searchProviderId: "rapid_etsy",
    platforms: ["all", "shopify"],
    isConfigured: isRapidEtsyConfigured,
    search: (query, region) => searchRapidEtsy(query, region),
    note: "Etsy API — ingest only, 45 req/month",
    unavailableReason: (configured) =>
      configured ? undefined : "RAPIDAPI_KEY missing or Etsy API disabled",
    categoryHints: [],
  },
  {
    id: "tiktok",
    label: "TikTok Shop",
    tier: "paid",
    searchProviderId: "tiktok",
    platforms: ["all", "tiktok"],
    isConfigured: isTikTokConfigured,
    search: (query, region) => searchTikTok(query, region),
    note: "JustOneAPI or official partner keys",
    unavailableReason: (configured) =>
      configured ? undefined : "TikTok Shop API keys missing",
    categoryHints: categoryHintsForProvider("tiktok"),
  },
];

const PROVIDER_BY_ID = new Map(
  PROVIDER_DEFINITIONS.map((definition) => [definition.id, definition])
);

export function getSearchProviderDefinitions(): SearchProviderDefinition[] {
  return PROVIDER_DEFINITIONS;
}

export function getSearchProviderDefinition(
  id: SearchProviderId
): SearchProviderDefinition | undefined {
  return PROVIDER_BY_ID.get(id);
}

export function getProviderLabel(id: SearchProviderId): string {
  return PROVIDER_BY_ID.get(id)?.label ?? id.replace(/_/g, " ");
}

export function getProviderLiveTruthLabel(id: SearchProviderId): string {
  if (id === "free_retail") return "Demo catalog";
  if (id === "cj") return "Live from CJ Dropshipping";
  return `Live from ${getProviderLabel(id)}`;
}

export type LiveSearchIncludeContext = {
  platform: SearchPlatform;
  freeRetailOk: boolean;
};

export function shouldIncludeProvider(
  definition: SearchProviderDefinition,
  ctx: LiveSearchIncludeContext
): boolean {
  if (!definition.platforms.includes(ctx.platform) && ctx.platform !== "all") {
    return false;
  }
  if (definition.id === "free_retail" && !ctx.freeRetailOk) {
    return false;
  }
  if (ctx.platform === "cj") return definition.id === "cj";
  if (ctx.platform === "aliexpress") return definition.id === "aliexpress";
  if (ctx.platform === "ebay") return definition.id === "ebay";
  if (ctx.platform === "amazon") return definition.id === "amazon";
  if (ctx.platform === "shopify") {
    return ["google_shopping", "serper", "serper_web", "serper_images", "free_retail", "shoptera"].includes(
      definition.id
    );
  }
  if (ctx.platform === "tiktok") return definition.id === "tiktok";
  if (ctx.platform === "all") {
    return true;
  }
  return definition.platforms.includes(ctx.platform);
}

export function resolveProviderUnavailableReason(
  definition: SearchProviderDefinition,
  configured: boolean,
  ctx?: ProviderUnavailableContext
): string | undefined {
  if (definition.unavailableReason) {
    return definition.unavailableReason(configured, ctx);
  }
  return configured ? undefined : `${definition.label} not configured`;
}
