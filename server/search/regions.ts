import type { RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";

export type RegionMapping = {
  ebayMarketplaceId: string;
  amazonDomain: string;
  googleCountry: string;
  googleLanguage: string;
  tiktokRegion: string;
  currency: string;
  defaultShipFrom: "US" | "UK" | "CN" | "EU";
  cjCountryCode: string;
  aliexpressShipFrom: "US" | "UK" | "CN" | "EU";
  shopteraOriginCountry: string;
};

const REGION_MAP: Record<RegionCode, RegionMapping> = {
  US: {
    ebayMarketplaceId: "EBAY_US",
    amazonDomain: "amazon.com",
    googleCountry: "us",
    googleLanguage: "en",
    tiktokRegion: "US",
    currency: "USD",
    defaultShipFrom: "US",
    cjCountryCode: "US",
    aliexpressShipFrom: "CN",
    shopteraOriginCountry: "US",
  },
  UK: {
    ebayMarketplaceId: "EBAY_GB",
    amazonDomain: "amazon.co.uk",
    googleCountry: "uk",
    googleLanguage: "en",
    tiktokRegion: "UK",
    currency: "GBP",
    defaultShipFrom: "UK",
    cjCountryCode: "UK",
    aliexpressShipFrom: "CN",
    shopteraOriginCountry: "GB",
  },
  EU: {
    ebayMarketplaceId: "EBAY_DE",
    amazonDomain: "amazon.de",
    googleCountry: "de",
    googleLanguage: "de",
    tiktokRegion: "DE",
    currency: "EUR",
    defaultShipFrom: "EU",
    cjCountryCode: "DE",
    aliexpressShipFrom: "CN",
    shopteraOriginCountry: "DE",
  },
  GLOBAL: {
    ebayMarketplaceId: ENV.ebayMarketplaceId,
    amazonDomain: ENV.serpAmazonDomain,
    googleCountry: ENV.serpGoogleCountry,
    googleLanguage: ENV.serpGoogleLanguage,
    tiktokRegion: ENV.tiktokShopRegion,
    currency: "USD",
    defaultShipFrom: "CN",
    cjCountryCode: "CN",
    aliexpressShipFrom: (ENV.aliexpressShipFromDefault === "US" ||
    ENV.aliexpressShipFromDefault === "UK" ||
    ENV.aliexpressShipFromDefault === "EU"
      ? ENV.aliexpressShipFromDefault
      : "CN") as RegionMapping["aliexpressShipFrom"],
    shopteraOriginCountry: "CN",
  },
};

export function resolveRegion(region?: RegionCode): RegionMapping {
  const code = region ?? (ENV.defaultRegion as RegionCode);
  return REGION_MAP[code] ?? REGION_MAP.US;
}

export function getRegionMapping(region: RegionCode): RegionMapping {
  return REGION_MAP[region];
}

export function getSupportedRegionOptions() {
  return ENV.supportedRegions.map((code) => ({
    code,
    label:
      code === "US"
        ? "United States"
        : code === "UK"
          ? "United Kingdom"
          : code === "EU"
            ? "Europe"
            : "Global",
    currency: REGION_MAP[code].currency,
  }));
}
