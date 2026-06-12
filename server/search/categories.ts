import { PRODUCT_CATEGORIES, type ProductCategory } from "@shared/searchTypes";

/** Keyword → category mapping for live products without provider taxonomy */
const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  electronics: [
    "phone", "earbud", "headphone", "charger", "cable", "usb", "bluetooth", "speaker",
    "tablet", "laptop", "camera", "smart", "wireless", "led light", "power bank", "gaming",
    "keyboard", "mouse", "monitor", "webcam",
  ],
  home: [
    "kitchen", "organizer", "storage", "decor", "lamp", "pillow", "blanket", "curtain",
    "furniture", "home", "cleaning", "bedding", "bath", "cookware", "utensil",
  ],
  garden: [
    "garden", "patio", "grill", "outdoor", "planter", "lawn", "pool", "greenhouse", "yard",
  ],
  beauty: [
    "skincare", "serum", "makeup", "cosmetic", "beauty", "face", "hair", "nail",
    "moisturizer", "cream", "lip", "mascara", "fragrance", "perfume", "beard",
  ],
  fashion: [
    "shirt", "dress", "shoe", "sneaker", "bag", "wallet", "watch", "clothing", "fashion",
    "hoodie", "jacket", "pants", "activewear", "loungewear", "handbag",
  ],
  jewelry: [
    "necklace", "ring", "bracelet", "earring", "pendant", "chain", "bangle", "jewelry",
  ],
  sports: [
    "fitness", "yoga", "gym", "sport", "outdoor", "camping", "hiking", "bike", "running",
    "exercise", "cycling", "swim", "fishing",
  ],
  toys: [
    "toy", "game", "puzzle", "kids", "children", "plush", "doll", "board game", "stem",
  ],
  baby: [
    "baby", "infant", "nursery", "stroller", "diaper", "bottle", "newborn", "toddler",
  ],
  pet: [
    "pet", "dog", "cat", "feeder", "collar", "aquarium", "puppy", "kitten", "bird", "fish",
  ],
  automotive: [
    "car", "auto", "vehicle", "dash", "tire", "motor", "driving", "motorcycle", "cabin",
  ],
  health: [
    "health", "wellness", "massage", "vitamin", "supplement", "first aid", "posture",
  ],
  office: [
    "office", "desk", "stationery", "pen", "notebook", "planner", "organizer", "whiteboard",
  ],
  tools: [
    "tool", "drill", "wrench", "hammer", "saw", "screwdriver", "toolbox", "workbench",
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
  providers: Array<
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
    | "free_retail"
    | "shoptera"
  >;
  seeds: string[];
};

export const CATEGORY_PROVIDER_ROUTING: Partial<Record<ProductCategory, CategoryProviderPriority>> = {
  electronics: {
    providers: ["serper", "serper_web", "ebay", "amazon", "google_shopping", "cj", "free_retail"],
    seeds: ["wireless earbuds", "phone charger", "smart watch", "bluetooth speaker"],
  },
  beauty: {
    providers: ["serper", "serper_images", "aliexpress", "cj", "tiktok", "google_shopping", "free_retail"],
    seeds: ["skincare serum", "makeup palette", "hair dryer", "nail art kit"],
  },
  home: {
    providers: ["serper", "serper_web", "aliexpress", "cj", "google_shopping", "amazon", "ebay", "free_retail"],
    seeds: ["kitchen gadget", "storage organizer", "led strip lights", "bed sheets"],
  },
  garden: {
    providers: ["serper", "serper_web", "aliexpress", "amazon", "ebay", "google_shopping", "free_retail"],
    seeds: ["garden tools", "patio furniture", "plant pots", "solar lights"],
  },
  fashion: {
    providers: ["serper", "serper_images", "cj", "aliexpress", "tiktok", "google_shopping", "free_retail"],
    seeds: ["activewear set", "crossbody bag", "sneakers", "loungewear"],
  },
  jewelry: {
    providers: ["aliexpress", "cj", "google_shopping", "free_retail"],
    seeds: ["necklace set", "fashion watch", "earrings", "bracelet"],
  },
  sports: {
    providers: ["google_shopping", "ebay", "amazon", "free_retail"],
    seeds: ["yoga mat", "resistance bands", "camping gear", "bike light"],
  },
  toys: {
    providers: ["tiktok", "google_shopping", "aliexpress", "free_retail"],
    seeds: ["stem toy", "plush toy", "board game", "educational toy"],
  },
  baby: {
    providers: ["amazon", "cj", "google_shopping", "free_retail"],
    seeds: ["baby monitor", "baby bottle", "stroller accessory", "nursery organizer"],
  },
  pet: {
    providers: ["amazon", "cj", "aliexpress", "google_shopping", "ebay", "free_retail"],
    seeds: ["dog feeder", "cat toy", "pet grooming", "aquarium filter"],
  },
  automotive: {
    providers: ["ebay", "amazon", "google_shopping", "aliexpress", "free_retail"],
    seeds: ["dash cam", "car organizer", "phone mount", "car vacuum"],
  },
  health: {
    providers: ["amazon", "google_shopping", "aliexpress", "free_retail"],
    seeds: ["massage gun", "posture corrector", "vitamin organizer", "sleep mask"],
  },
  office: {
    providers: ["amazon", "google_shopping", "cj", "free_retail"],
    seeds: ["desk organizer", "webcam", "standing desk", "notebook set"],
  },
  tools: {
    providers: ["ebay", "amazon", "aliexpress", "google_shopping", "free_retail"],
    seeds: ["cordless drill", "tool set", "laser measure", "work gloves"],
  },
};

export function getCategoryProviderOrder(category?: string): string[] | undefined {
  if (!category) return undefined;
  const routing = CATEGORY_PROVIDER_ROUTING[category as ProductCategory];
  return routing?.providers;
}

export function getCategorySeedQueries(category?: string): string[] {
  if (!category) return [];
  const routing = CATEGORY_PROVIDER_ROUTING[category as ProductCategory];
  return routing?.seeds ?? [];
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
