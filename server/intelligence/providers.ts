import { isSerpConfigured } from "../search/serpapi";
import { isSerperConfigured } from "../search/serper";
import { isJustSerpConfigured } from "../search/justserp";
import { isMetaAdLibraryConfigured } from "./adLibrary";
import { isTikTokAdsConfigured } from "./tiktokAds";
import { isTikTokConfigured } from "../search/tiktok";

export function isTrendIntelConfigured(): boolean {
  return isSerpConfigured() || isSerperConfigured() || isJustSerpConfigured();
}

export function getIntelProviderStatus() {
  return {
    trends: isTrendIntelConfigured(),
    meta: isMetaAdLibraryConfigured(),
    tiktokAds: isTikTokAdsConfigured(),
    tiktokShop: isTikTokConfigured(),
  };
}
