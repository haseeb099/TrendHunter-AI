export type RegionCode = "US" | "UK" | "EU" | "GLOBAL";
export type ShipFromCode = "US" | "UK" | "CN" | "EU";
export type SortOption = "price_asc" | "price_desc" | "trend_score" | "rating";

export type ProductHuntFilters = {
  priceRange?: { min: number; max: number };
  region?: RegionCode;
  category?: string;
  shipFrom?: ShipFromCode[];
  sort?: SortOption;
  minRating?: number;
  maxShippingDays?: number;
};

/** @deprecated Use ProductHuntFilters */
export type ProductSearchFilters = ProductHuntFilters;

/** Explainable inputs behind a product trend score (heuristic + optional signal fusion). */
export type TrendScoreInputs = {
  baseScore: number;
  ratingBoost: number;
  shippingBoost: number;
  priceBoost: number;
  trendingFlag: number;
  /** Set when trending ingest blends external signals */
  momentumScore?: number;
  adSaturationScore?: number;
  marginHint?: number;
  supplierConfidence?: number;
};

export type ProductSearchResult = {
  id: string;
  title: string;
  price: number;
  platform: string;
  image: string | null;
  shippingDays: number | null;
  supplier: string | null;
  rating: number | null;
  sourceUrl: string | null;
  region?: RegionCode;
  currency?: string;
  category?: string;
  shipFrom?: ShipFromCode;
  warehouse?: string;
  trendScore?: number;
  trendScoreInputs?: TrendScoreInputs;
  moq?: number;
  isTrending?: boolean;
  /** Human-readable explanation for Discover ranking (server-computed). */
  rankReason?: string;
  /** Canonical product graph identity (cross-platform dedupe). */
  canonicalProductId?: string;
  /** Provider that supplied this listing. */
  sourceProvider?: SearchProviderId;
  /** ISO timestamp when this listing was last fetched. */
  listingFetchedAt?: string;
  /** Other platforms where the same canonical product is listed. */
  alsoListedOn?: string[];
  /** Ranking model version when score was computed. */
  rankingVersion?: string;
  /** Rich ranking explanation (decision engine v2). */
  rankingExplanation?: RankingExplanation;
};

export type RankingExplanation = {
  version: string;
  summary: string;
  topSignals: Array<{
    name: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
  confidence: "high" | "medium" | "low";
  staleFeatures?: boolean;
};

export type ProductOffer = {
  id: string;
  productId?: string;
  productTitle: string;
  supplierPlatform: "cj" | "aliexpress" | "manual";
  supplierSku?: string;
  warehouse?: string;
  shipFrom: ShipFromCode;
  unitCost: number;
  shippingCost: number;
  moq: number;
  processingDays?: number;
  shippingDaysMin?: number;
  shippingDaysMax?: number;
  currency: string;
  landedCost: number;
};

export type ProductOffersResponse = {
  offers: ProductOffer[];
  dataMode: DataMode;
  cachedAt?: string;
  stale?: boolean;
};

export type SearchProviderId =
  | "ebay"
  | "amazon"
  | "google_shopping"
  | "tiktok"
  | "free_retail"
  | "shoptera";

export type SearchProviderTier = "free" | "paid";

export type SearchProviderStatus = {
  id: SearchProviderId;
  label: string;
  configured: boolean;
  /** True when provider keys exist but the source is unavailable or rate-limited */
  degraded?: boolean;
  platforms: string[];
  tier: SearchProviderTier;
  note?: string;
};

export type DataMode = "cached" | "live";

/** How trustworthy / fresh the displayed data is */
export type DataState = "live" | "cached" | "stale" | "synthetic" | "unavailable";

export function resolveDataState(options: {
  dataMode?: DataMode;
  stale?: boolean;
  synthetic?: boolean;
  unavailable?: boolean;
}): DataState {
  if (options.unavailable) return "unavailable";
  if (options.synthetic) return "synthetic";
  if (options.dataMode === "live") return "live";
  if (options.stale) return "stale";
  return "cached";
}

export type ProductSearchResponse = {
  results: ProductSearchResult[];
  sources: SearchProviderId[];
  /** @deprecated Legacy snapshots only — new responses always false */
  isDemo?: boolean;
  warnings?: string[];
  /** How results were served */
  dataMode?: DataMode;
  /** ISO timestamp when underlying data was fetched */
  cachedAt?: string;
  /** True when serving expired cache because live APIs were not called */
  stale?: boolean;
  /** Credits spent on this request (0 for cached) */
  creditsUsed?: number;
  /** Adjacent queries suggested on zero-result (S21) */
  recoverySuggestions?: string[];
};

export type ProductIntelligenceSummary = {
  keyword: string;
  region: RegionCode;
  trendMomentum: number | null;
  trendLabel: "rising" | "stable" | "declining" | null;
  changePercent90d: number | null;
  activeAdCount: number | null;
  advertiserCount: number | null;
  fetchedAt: string | null;
  /** True when any underlying intel snapshot was served past TTL */
  stale?: boolean;
};

export const PRODUCT_CATEGORIES = [
  "electronics",
  "home",
  "beauty",
  "fashion",
  "sports",
  "toys",
  "automotive",
  "pet",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const REGION_LABELS: Record<RegionCode, string> = {
  US: "United States",
  UK: "United Kingdom",
  EU: "Europe",
  GLOBAL: "Global",
};

export const SHIP_FROM_OPTIONS: { code: ShipFromCode; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "UK", label: "United Kingdom" },
  { code: "CN", label: "China" },
  { code: "EU", label: "Europe" },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "trend_score", label: "Trend Score" },
  { value: "rating", label: "Rating" },
];

export function formatProductPrice(price: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}
