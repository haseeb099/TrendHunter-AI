export type RegionCode = "US" | "UK" | "EU" | "GLOBAL";
export type ShipFromCode = "US" | "UK" | "CN" | "EU";
export type SortOption = "price_asc" | "price_desc" | "trend_score" | "rating";

export type ProductHuntFilters = {
  priceRange?: { min: number; max: number };
  region?: RegionCode;
  category?: string;
  subcategory?: string;
  productType?: string;
  /** Filter by product title (Discover toolbar search). */
  query?: string;
  shipFrom?: ShipFromCode[];
  sort?: SortOption;
  minRating?: number;
  maxShippingDays?: number;
};

export type SearchPagination = {
  limit?: number;
  cursor?: number;
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
  subcategory?: string;
  productType?: string;
  taxonomyId?: number;
  shipFrom?: ShipFromCode;
  warehouse?: string;
  trendScore?: number;
  trendScoreInputs?: TrendScoreInputs;
  moq?: number;
  isTrending?: boolean | null;
  /** True when category was inferred from title (no provider category). */
  categoryInferred?: boolean;
  /** Per-product freshness / provenance state. */
  dataState?: DataState;
  /** Human-readable freshness label, e.g. "Live from Amazon". */
  dataLabel?: string;
  /** True when ranking used heuristic fallbacks for missing signals. */
  inferredScores?: boolean;
  /** Supplier match quality (exact/similar/none) when offers are resolved. */
  supplierMatchState?: "exact" | "similar" | "none";
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
  /** Full signal breakdown (all active ranking signals). */
  signals?: Array<{
    name: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
  /** Signal names included in the fused score. */
  signalsUsed?: string[];
  /** Signal names absent — score is partial when non-empty. */
  signalsMissing?: string[];
  /** True when weight coverage is below full model (missing live signals). */
  partialScore?: boolean;
  /** Fraction of model weight with resolved signals (0–1). */
  scoreCoverage?: number;
  confidence: "high" | "medium" | "low";
  staleFeatures?: boolean;
  /** True when one or more ranking signals used heuristic fallbacks. */
  inferredScores?: boolean;
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

export type SupplierMatchState = "exact" | "similar" | "none";

export type ProductOffersResponse = {
  offers: ProductOffer[];
  dataMode: DataMode;
  cachedAt?: string;
  stale?: boolean;
  /** How closely supplier offers match the searched product */
  matchState?: SupplierMatchState;
  /** Human-readable explanation of match quality */
  message?: string;
};

export type SearchProviderId =
  | "ebay"
  | "amazon"
  | "google_shopping"
  | "serper"
  | "serper_web"
  | "serper_images"
  | "serper_news"
  | "tiktok"
  | "aliexpress"
  | "cj"
  | "ropeship"
  | "free_retail"
  | "shoptera"
  | "rapid_product"
  | "rapid_google"
  | "rapid_etsy"
  | "rapid_amazon_scraper"
  | "rapid_lazada"
  | "rapid_amazon"
  | "rapid_ebay"
  | "rapid_walmart"
  | "rapid_aliexpress"
  | "rapid_web"
  | "rapid_news"
  | "rapid_news_api";

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

export type SupplierPlatformId = "cj" | "aliexpress";

export type SupplierPlatformStatus = {
  id: SupplierPlatformId;
  label: string;
  configured: boolean;
  /** live = API keys configured; catalog = static directory only */
  mode: "live" | "catalog";
  note?: string;
};

export type MarketplaceCoverage = {
  search: SearchProviderStatus[];
  suppliers: SupplierPlatformStatus[];
};

export type DataMode = "cached" | "live";

/** How trustworthy / fresh the displayed data is */
export type DataState =
  | "live"
  | "cached"
  | "stale"
  | "synthetic"
  | "unavailable"
  /** Heuristic or inferred values — not from a live provider fetch */
  | "estimated"
  /** Provider not configured or no data exists */
  | "missing";

export function resolveDataState(options: {
  dataMode?: DataMode;
  stale?: boolean;
  synthetic?: boolean;
  unavailable?: boolean;
  inferredScores?: boolean;
}): DataState {
  if (options.unavailable) return "missing";
  if (options.inferredScores) return "estimated";
  if (options.synthetic) return "synthetic";
  if (options.dataMode === "live") return "live";
  if (options.stale) return "stale";
  return "cached";
}

export type ProductSearchResponse = {
  results: ProductSearchResult[];
  sources: SearchProviderId[];
  /** Total matches before pagination slice */
  totalCount?: number;
  /** Offset cursor for next page, undefined when no more results */
  nextCursor?: number;
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
  /** Per-provider availability for live search (configured, skipped, failed). */
  providerAvailability?: SearchProviderAvailability[];
};

export type SearchProviderAvailability = {
  id: SearchProviderId;
  label: string;
  available: boolean;
  unavailableReason?: string;
};

export type CategoryTaxonomyRow = {
  id: number;
  rootCategory: string;
  subcategory: string | null;
  productType: string | null;
  useCase: string | null;
  audience: string | null;
  priceBand: string | null;
  regionRelevance: string | null;
};

export type CategoryTreeNode = {
  id: number;
  label: string;
  value: string;
  children?: CategoryTreeNode[];
};

export type ProductIntelligenceSummary = {
  keyword: string;
  region: RegionCode;
  trendMomentum: number | null;
  trendLabel: "rising" | "stable" | "declining" | null;
  changePercent90d: number | null;
  activeAdCount: number | null;
  advertiserCount: number | null;
  tiktokActiveAdCount: number | null;
  tiktokAdvertiserCount: number | null;
  fetchedAt: string | null;
  /** True when any underlying intel snapshot was served past TTL */
  stale?: boolean;
};

export const PRODUCT_CATEGORIES = [
  "electronics",
  "home",
  "garden",
  "beauty",
  "fashion",
  "jewelry",
  "sports",
  "toys",
  "baby",
  "pet",
  "automotive",
  "health",
  "office",
  "tools",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Human-readable labels for root browse categories (Amazon / CJ / AliExpress aligned). */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  electronics: "Electronics",
  home: "Home & Kitchen",
  garden: "Garden & Outdoor",
  beauty: "Beauty & Personal Care",
  fashion: "Fashion & Apparel",
  jewelry: "Jewelry & Watches",
  sports: "Sports & Outdoors",
  toys: "Toys & Games",
  baby: "Baby & Nursery",
  pet: "Pet Supplies",
  automotive: "Automotive",
  health: "Health & Wellness",
  office: "Office & School",
  tools: "Tools & Home Improvement",
};

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
