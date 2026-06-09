import type { ProductHuntFilters, ProductSearchResult, RegionCode } from "@shared/searchTypes";
import type { SearchPlatform } from "./utils";
import { resolveRegion } from "./regions";

const DEMO_PRODUCTS: Array<Omit<ProductSearchResult, "id"> & { idPrefix: string }> = [
  {
    idPrefix: "mock-earbuds",
    title: "Wireless Earbuds Pro — Noise Cancelling",
    price: 24.99,
    platform: "tiktok",
    image: null,
    shippingDays: 5,
    supplier: "Shenzhen Audio Co",
    rating: 4.7,
    sourceUrl: null,
    category: "electronics",
    shipFrom: "CN",
    warehouse: "CN",
    trendScore: 88,
    moq: 1,
    isTrending: true,
  },
  {
    idPrefix: "mock-led",
    title: "LED Strip Lights RGB 10m — Smart App Control",
    price: 12.49,
    platform: "amazon",
    image: null,
    shippingDays: 3,
    supplier: "Amazon",
    rating: 4.5,
    sourceUrl: null,
    category: "home",
    shipFrom: "US",
    warehouse: "US",
    trendScore: 82,
    moq: 1,
    isTrending: true,
  },
  {
    idPrefix: "mock-yoga",
    title: "Eco Yoga Mat — Non-Slip Cork",
    price: 34.99,
    platform: "shopify",
    image: null,
    shippingDays: 4,
    supplier: "UK Wellness Ltd",
    rating: 4.6,
    sourceUrl: null,
    category: "sports",
    shipFrom: "UK",
    warehouse: "UK",
    trendScore: 75,
    moq: 2,
    isTrending: true,
  },
  {
    idPrefix: "mock-skincare",
    title: "Vitamin C Serum — Brightening Formula",
    price: 18.99,
    platform: "tiktok",
    image: null,
    shippingDays: 7,
    supplier: "Beauty Direct CN",
    rating: 4.4,
    sourceUrl: null,
    category: "beauty",
    shipFrom: "CN",
    warehouse: "CN",
    trendScore: 91,
    moq: 1,
    isTrending: true,
  },
  {
    idPrefix: "mock-organizer",
    title: "Desk Cable Organizer — Magnetic Base",
    price: 9.99,
    platform: "ebay",
    image: null,
    shippingDays: 6,
    supplier: "eBay Seller UK",
    rating: 4.3,
    sourceUrl: null,
    category: "electronics",
    shipFrom: "UK",
    warehouse: "UK",
    trendScore: 79,
    moq: 1,
    isTrending: false,
  },
  {
    idPrefix: "mock-bottle",
    title: "Insulated Water Bottle 32oz — Stainless Steel",
    price: 22.5,
    platform: "amazon",
    image: null,
    shippingDays: 2,
    supplier: "Amazon",
    rating: 4.8,
    sourceUrl: null,
    category: "sports",
    shipFrom: "US",
    warehouse: "US",
    trendScore: 70,
    moq: 1,
    isTrending: false,
  },
  {
    idPrefix: "mock-pet",
    title: "Automatic Pet Feeder — WiFi Enabled",
    price: 49.99,
    platform: "shopify",
    image: null,
    shippingDays: 8,
    supplier: "PetTech EU",
    rating: 4.2,
    sourceUrl: null,
    category: "pet",
    shipFrom: "EU",
    warehouse: "EU",
    trendScore: 68,
    moq: 1,
    isTrending: false,
  },
  {
    idPrefix: "mock-phone",
    title: "MagSafe Phone Stand — Adjustable Aluminum",
    price: 15.99,
    platform: "tiktok",
    image: null,
    shippingDays: 5,
    supplier: "TikTok Shop US",
    rating: 4.5,
    sourceUrl: null,
    category: "electronics",
    shipFrom: "US",
    warehouse: "US",
    trendScore: 85,
    moq: 1,
    isTrending: true,
  },
  {
    idPrefix: "mock-diffuser",
    title: "Essential Oil Diffuser — Ultrasonic 300ml",
    price: 19.99,
    platform: "amazon",
    image: null,
    shippingDays: 4,
    supplier: "Amazon DE",
    rating: 4.1,
    sourceUrl: null,
    category: "home",
    shipFrom: "EU",
    warehouse: "EU",
    trendScore: 72,
    moq: 1,
    isTrending: false,
  },
  {
    idPrefix: "mock-backpack",
    title: "Anti-Theft Travel Backpack — USB Charging Port",
    price: 39.99,
    platform: "ebay",
    image: null,
    shippingDays: 10,
    supplier: "Global Bags CN",
    rating: 4.0,
    sourceUrl: null,
    category: "fashion",
    shipFrom: "CN",
    warehouse: "CN",
    trendScore: 65,
    moq: 5,
    isTrending: false,
  },
  {
    idPrefix: "mock-ring",
    title: "Smart Ring Fitness Tracker — Sleep Monitor",
    price: 59.99,
    platform: "tiktok",
    image: null,
    shippingDays: 6,
    supplier: "Wearable Tech",
    rating: 4.6,
    sourceUrl: null,
    category: "electronics",
    shipFrom: "CN",
    warehouse: "CN",
    trendScore: 93,
    moq: 1,
    isTrending: true,
  },
  {
    idPrefix: "mock-planter",
    title: "Self-Watering Planter Set — 3 Pack Ceramic",
    price: 27.99,
    platform: "shopify",
    image: null,
    shippingDays: 5,
    supplier: "Home & Garden UK",
    rating: 4.7,
    sourceUrl: null,
    category: "home",
    shipFrom: "UK",
    warehouse: "UK",
    trendScore: 77,
    moq: 2,
    isTrending: true,
  },
  {
    idPrefix: "mock-car",
    title: "Car Phone Mount — Dashboard Suction",
    price: 11.99,
    platform: "ebay",
    image: null,
    shippingDays: 3,
    supplier: "Auto Accessories US",
    rating: 4.3,
    sourceUrl: null,
    category: "automotive",
    shipFrom: "US",
    warehouse: "US",
    trendScore: 60,
    moq: 1,
    isTrending: false,
  },
  {
    idPrefix: "mock-toy",
    title: "Fidget Toy Bundle — Stress Relief 12 Pack",
    price: 8.99,
    platform: "tiktok",
    image: null,
    shippingDays: 7,
    supplier: "TikTok Shop",
    rating: 4.9,
    sourceUrl: null,
    category: "toys",
    shipFrom: "CN",
    warehouse: "CN",
    trendScore: 86,
    moq: 1,
    isTrending: true,
  },
  {
    idPrefix: "mock-lamp",
    title: "Sunrise Alarm Clock — Wake-Up Light",
    price: 32.99,
    platform: "amazon",
    image: null,
    shippingDays: 2,
    supplier: "Amazon UK",
    rating: 4.5,
    sourceUrl: null,
    category: "home",
    shipFrom: "UK",
    warehouse: "UK",
    trendScore: 74,
    moq: 1,
    isTrending: false,
  },
  {
    idPrefix: "mock-brush",
    title: "Electric Facial Cleansing Brush — Waterproof",
    price: 21.99,
    platform: "shopify",
    image: null,
    shippingDays: 9,
    supplier: "Beauty EU",
    rating: 4.2,
    sourceUrl: null,
    category: "beauty",
    shipFrom: "EU",
    warehouse: "EU",
    trendScore: 81,
    moq: 1,
    isTrending: true,
  },
  {
    idPrefix: "mock-charger",
    title: "GaN USB-C Charger 65W — 3 Port",
    price: 28.99,
    platform: "ebay",
    image: null,
    shippingDays: 4,
    supplier: "Tech Wholesale",
    rating: 4.6,
    sourceUrl: null,
    category: "electronics",
    shipFrom: "US",
    warehouse: "US",
    trendScore: 83,
    moq: 3,
    isTrending: true,
  },
  {
    idPrefix: "mock-pillow",
    title: "Memory Foam Neck Pillow — Travel Kit",
    price: 16.49,
    platform: "amazon",
    image: null,
    shippingDays: 5,
    supplier: "Amazon",
    rating: 4.4,
    sourceUrl: null,
    category: "home",
    shipFrom: "US",
    warehouse: "US",
    trendScore: 66,
    moq: 1,
    isTrending: false,
  },
];

function regionPriceMultiplier(region: RegionCode): number {
  switch (region) {
    case "UK":
      return 0.79;
    case "EU":
      return 0.92;
    default:
      return 1;
  }
}

export function searchMock(
  query: string,
  platform: SearchPlatform,
  filters?: ProductHuntFilters
): ProductSearchResult[] {
  const base = query.trim() || "trending";
  const region = filters?.region ?? "US";
  const mapping = resolveRegion(region);
  const multiplier = regionPriceMultiplier(region);

  let products = DEMO_PRODUCTS.map((p) => {
    const { idPrefix, ...rest } = p;
    const title =
      platform === "all" || rest.platform === platform || platform === "shopify"
        ? `${rest.title}`
        : rest.title;

    return {
      ...rest,
      id: `${idPrefix}-${platform}-${region}`,
      title: title.includes(base) ? title : `${capitalize(base)} — ${title}`,
      price: Math.round(rest.price * multiplier * 100) / 100,
      platform: platform === "all" ? rest.platform : platform === "shopify" ? rest.platform : platform,
      currency: mapping.currency,
      region,
    } satisfies ProductSearchResult;
  });

  if (platform !== "all" && platform !== "shopify") {
    products = products.filter((p) => p.platform === platform || p.platform === "demo");
  }

  if (filters?.category) {
    const cat = filters.category.toLowerCase();
    products = products.filter((p) => p.category?.toLowerCase() === cat);
  }

  return products;
}

export function getTrendingMockProducts(
  region: RegionCode = "US",
  category?: string
): ProductSearchResult[] {
  return searchMock("trending", "all", { region, category, sort: "trend_score" })
    .filter((p) => p.isTrending)
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
