export type SellingPlatform = "amazon" | "ebay" | "shopify" | "tiktok" | "temu" | "etsy";



export type PlatformFeeEntry = {

  platform: SellingPlatform;

  label: string;

  /** Referral / commission rate as decimal (e.g. 0.15 = 15%) */

  defaultRate: number;

  /** Flat per-order fee in USD when applicable */

  flatFeeUsd?: number;

  categoryOverrides?: Record<string, number>;

  notes?: string;

};



/** Approximate 2026 marketplace fee tables — override manually in profit calc when needed. */

export const PLATFORM_FEES: PlatformFeeEntry[] = [

  {

    platform: "amazon",

    label: "Amazon",

    defaultRate: 0.15,

    flatFeeUsd: 0.3,

    categoryOverrides: {

      electronics: 0.08,

      beauty: 0.15,

      home: 0.15,

      fashion: 0.17,

    },

    notes: "Referral fee varies by category; FBA fees not included.",

  },

  {

    platform: "ebay",

    label: "eBay",

    defaultRate: 0.1325,

    flatFeeUsd: 0.3,

    notes: "Final value fee ~12.9% + $0.30 per order (US).",

  },

  {

    platform: "shopify",

    label: "Shopify",

    defaultRate: 0.029,

    flatFeeUsd: 0.3,

    notes: "Basic plan card rate; excludes subscription.",

  },

  {

    platform: "tiktok",

    label: "TikTok Shop",

    defaultRate: 0.06,

    notes: "Commission ~6% in US; varies by category.",

  },

  {

    platform: "temu",

    label: "Temu",

    defaultRate: 0.15,

    notes: "Seller commission estimate; confirm in seller center.",

  },

  {

    platform: "etsy",

    label: "Etsy",

    defaultRate: 0.065,

    flatFeeUsd: 0.2,

    notes: "6.5% transaction + listing fees not included.",

  },

];



export const PLATFORM_FEE_TABLE: Record<SellingPlatform, PlatformFeeEntry> = PLATFORM_FEES.reduce(

  (acc, entry) => {

    acc[entry.platform] = entry;

    return acc;

  },

  {} as Record<SellingPlatform, PlatformFeeEntry>

);



export const SELLING_PLATFORMS = PLATFORM_FEES.map((p) => ({ id: p.platform, label: p.label }));



export function getPlatformFeeEntry(platform: SellingPlatform): PlatformFeeEntry | undefined {

  return PLATFORM_FEE_TABLE[platform];

}



/** Estimated platform fee in USD for a single unit sale. */

export function calculatePlatformFee(

  sellingPrice: number,

  platform: SellingPlatform,

  category?: string

): number {

  return getPlatformFeeBreakdown(sellingPrice, platform, category).total;

}



export type PlatformFeeBreakdown = {

  platform: SellingPlatform;

  label: string;

  referralRate: number;

  referralFee: number;

  flatFee: number;

  total: number;

};



export function getPlatformFeeBreakdown(

  sellingPrice: number,

  platform: SellingPlatform,

  category?: string

): PlatformFeeBreakdown {

  const entry = getPlatformFeeEntry(platform);

  if (!entry || sellingPrice <= 0) {

    return {

      platform,

      label: entry?.label ?? platform,

      referralRate: 0,

      referralFee: 0,

      flatFee: 0,

      total: 0,

    };

  }

  const cat = category?.toLowerCase();

  const referralRate =

    cat && entry.categoryOverrides?.[cat] != null

      ? entry.categoryOverrides[cat]

      : entry.defaultRate;

  const referralFee = Math.round(sellingPrice * referralRate * 100) / 100;

  const flatFee = entry.flatFeeUsd ?? 0;

  const total = Math.round((referralFee + flatFee) * 100) / 100;

  return {

    platform,

    label: entry.label,

    referralRate,

    referralFee,

    flatFee,

    total,

  };

}



/** @deprecated Use calculatePlatformFee */

export function estimatePlatformFeeUsd(

  platform: SellingPlatform,

  sellingPrice: number,

  category?: string

): number {

  return calculatePlatformFee(sellingPrice, platform, category);

}


