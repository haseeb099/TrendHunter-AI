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
  moq?: number;
  isTrending?: boolean;
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
  isDemo?: boolean;
};

export type SearchProviderId =
  | "ebay"
  | "amazon"
  | "google_shopping"
  | "tiktok"
  | "free_retail"
  | "shoptera"
  | "mock";

export type SearchProviderTier = "free" | "paid" | "demo";

export type SearchProviderStatus = {
  id: SearchProviderId;
  label: string;
  configured: boolean;
  platforms: string[];
  tier: SearchProviderTier;
  note?: string;
};

export type DataMode = "cached" | "live" | "demo";

export type ProductSearchResponse = {
  results: ProductSearchResult[];
  sources: SearchProviderId[];
  isDemo: boolean;
  warnings?: string[];
  /** How results were served */
  dataMode?: DataMode;
  /** ISO timestamp when underlying data was fetched */
  cachedAt?: string;
  /** True when serving expired cache because live APIs were not called */
  stale?: boolean;
  /** Credits spent on this request (0 for cached) */
  creditsUsed?: number;
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
