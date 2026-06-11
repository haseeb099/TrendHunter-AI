import { PRODUCT_CATEGORIES, type ProductCategory } from "@shared/searchTypes";

/** Keyword → category mapping for live products without provider taxonomy */
const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  electronics: [
    "phone", "earbud", "headphone", "charger", "cable", "usb", "bluetooth", "speaker",
    "tablet", "laptop", "camera", "smart", "wireless", "led light", "power bank",
  ],
  home: [
    "kitchen", "organizer", "storage", "decor", "lamp", "pillow", "blanket", "curtain",
    "furniture", "home", "garden", "tool", "cleaning",
  ],
  beauty: [
    "skincare", "serum", "makeup", "cosmetic", "beauty", "face", "hair", "nail",
    "moisturizer", "cream", "lip", "mascara",
  ],
  fashion: [
    "shirt", "dress", "shoe", "sneaker", "bag", "wallet", "watch", "jewelry",
    "clothing", "fashion", "hoodie", "jacket",
  ],
  sports: [
    "fitness", "yoga", "gym", "sport", "outdoor", "camping", "hiking", "bike",
    "running", "exercise",
  ],
  toys: [
    "toy", "game", "puzzle", "kids", "children", "baby", "plush", "doll",
  ],
  automotive: [
    "car", "auto", "vehicle", "dash", "tire", "motor", "driving",
  ],
  pet: [
    "pet", "dog", "cat", "feeder", "collar", "aquarium", "puppy", "kitten",
  ],
};

export function inferCategoryFromTitle(title: string): ProductCategory | undefined {
  const lower = title.toLowerCase();
  let best: ProductCategory | undefined;
  let bestScore = 0;

  for (const category of PRODUCT_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  return bestScore > 0 ? best : undefined;
}

export type CategoryProviderPriority = {
  providers: Array<"ebay" | "amazon" | "google_shopping" | "tiktok" | "free_retail" | "shoptera">;
  seeds: string[];
};

export const CATEGORY_PROVIDER_ROUTING: Partial<Record<ProductCategory, CategoryProviderPriority>> = {
  electronics: {
    providers: ["ebay", "amazon", "google_shopping", "free_retail"],
    seeds: ["phone accessories", "chargers", "earbuds"],
  },
  beauty: {
    providers: ["tiktok", "google_shopping", "free_retail"],
    seeds: ["serum", "mascara", "skincare tool"],
  },
  home: {
    providers: ["google_shopping", "amazon", "ebay", "free_retail"],
    seeds: ["kitchen gadget", "organizer", "led lights"],
  },
  fashion: {
    providers: ["tiktok", "google_shopping", "free_retail"],
    seeds: ["activewear", "loungewear"],
  },
  sports: {
    providers: ["google_shopping", "ebay", "free_retail"],
    seeds: ["yoga mat", "resistance bands"],
  },
  toys: {
    providers: ["tiktok", "google_shopping", "free_retail"],
    seeds: ["viral gadget", "gift", "trending tiktok"],
  },
};

export function getCategoryProviderOrder(category?: string): string[] | undefined {
  if (!category) return undefined;
  const routing = CATEGORY_PROVIDER_ROUTING[category as ProductCategory];
  return routing?.providers;
}

export function categoryMatchesFilter(
  itemCategory: string | undefined,
  title: string,
  filterCategory: string
): boolean {
  const target = filterCategory.toLowerCase();
  if (itemCategory?.toLowerCase() === target) return true;
  const inferred = inferCategoryFromTitle(title);
  return inferred === target;
}
