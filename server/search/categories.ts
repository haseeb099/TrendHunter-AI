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
