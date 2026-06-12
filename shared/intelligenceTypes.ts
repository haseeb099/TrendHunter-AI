import type { RegionCode } from "./searchTypes";

export type TrendWindow = "7d" | "30d" | "90d";

export type TrendInterestPoint = {
  date: string;
  value: number;
};

export type TrendSignal = {
  keyword: string;
  region: RegionCode;
  source: "google_trends" | "serper" | "reddit" | "manual";
  momentumScore: number;
  momentumLabel: "rising" | "stable" | "declining";
  changePercent7d: number | null;
  changePercent30d: number | null;
  changePercent90d: number | null;
  interestOverTime: TrendInterestPoint[];
  relatedQueries: string[];
  risingQueries: string[];
  fetchedAt: string;
  isLive: boolean;
  /** True when serving expired cache because live refresh was not used */
  stale?: boolean;
};

export type AdLibraryCreative = {
  id: string;
  advertiserName: string;
  bodyText: string | null;
  ctaText: string | null;
  platforms: string[];
  startDate: string | null;
  isActive: boolean;
  snapshotUrl: string | null;
};

export type AdLibrarySnapshot = {
  keyword: string;
  region: string;
  activeAdCount: number;
  advertiserCount: number;
  creatives: AdLibraryCreative[];
  gaps: string[];
  fetchedAt: string;
  isLive: boolean;
  stale?: boolean;
};

export type TikTokAdCreative = {
  id: string;
  advertiserName: string;
  bodyText: string | null;
  videoUrl: string | null;
  coverUrl: string | null;
  firstShown: string | null;
  lastShown: string | null;
  isActive: boolean;
};

export type TikTokAdsSnapshot = {
  keyword: string;
  region: string;
  activeAdCount: number;
  advertiserCount: number;
  creatives: TikTokAdCreative[];
  gaps: string[];
  fetchedAt: string;
  isLive: boolean;
  source: "searchapi" | "scrapecreators" | "cached";
  stale?: boolean;
};

export type IntelCoverageLevel = "high" | "medium" | "low";

export type CachedIntelContext = {
  trendFetchedAt: string | null;
  adsFetchedAt: string | null;
  trendStale: boolean;
  adsStale: boolean;
  coverage: IntelCoverageLevel;
  summary: string;
};

export type MarketGapItem = {
  title: string;
  opportunity: string;
  demand_level: string;
  competition_level: string;
  estimated_margin: string;
  confidence: IntelCoverageLevel;
};

export type MarketDigestItem = {
  keyword: string;
  region: RegionCode;
  momentumScore: number | null;
  momentumLabel: TrendSignal["momentumLabel"] | null;
  changePercent90d: number | null;
  activeAdCount: number | null;
  advertiserCount: number | null;
  fetchedAt: string;
  source: "google_trends" | "meta_ads";
};

export type IngestRunStatus = {
  id: number;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  apiCounts: Record<string, number>;
  errors: string[];
};
