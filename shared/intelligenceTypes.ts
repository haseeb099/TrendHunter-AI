import type { RegionCode } from "./searchTypes";

export type TrendInterestPoint = {
  date: string;
  value: number;
};

export type TrendSignal = {
  keyword: string;
  region: RegionCode;
  source: "google_trends" | "reddit" | "manual";
  momentumScore: number;
  momentumLabel: "rising" | "stable" | "declining";
  changePercent90d: number | null;
  interestOverTime: TrendInterestPoint[];
  relatedQueries: string[];
  risingQueries: string[];
  fetchedAt: string;
  isLive: boolean;
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
