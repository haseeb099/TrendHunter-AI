import { CATEGORY_LABELS, PRODUCT_CATEGORIES, type ProductCategory } from "./searchTypes";

export type SupplierOrigin = "China" | "Hong Kong" | "US" | "EU" | "Global" | "SEA";

export type GlobalSupplierSlug =
  | "aliexpress"
  | "cj"
  | "1688"
  | "alibaba"
  | "dhgate"
  | "banggood"
  | "made-in-china"
  | "globalsources"
  | "eprolo"
  | "hypersku"
  | "zendrop"
  | "saleyee"
  | "spocket"
  | "printful"
  | "printify"
  | "faire"
  | "wholesale2b"
  | "lazada";

export type SupplierDirectoryDefinition = {
  slug: GlobalSupplierSlug;
  name: string;
  origin: SupplierOrigin;
  homepageUrl: string;
  /** Categories this marketplace is useful for; `"all"` = general wholesale. */
  categories: ProductCategory[] | "all";
  coverageScore: number;
  regions: string[];
  notes: string;
  /** When set, DropHunter can pull live product samples via API. */
  apiIntegrated?: "cj" | "aliexpress";
  buildSearchUrl: (query: string) => string;
};

function enc(query: string): string {
  return encodeURIComponent(query.replace(/\s+/g, " ").trim());
}

function plus(query: string): string {
  return enc(query).replace(/%20/g, "+");
}

/** Default wholesale search term when no category filter is active. */
export const DEFAULT_SUPPLIER_SEARCH_QUERY = "wholesale";

export function categorySearchQuery(category: ProductCategory): string {
  return CATEGORY_LABELS[category];
}

export function supplierCoversCategory(
  supplier: SupplierDirectoryDefinition,
  category: ProductCategory
): boolean {
  return supplier.categories === "all" || supplier.categories.includes(category);
}

export const GLOBAL_SUPPLIER_DIRECTORY: SupplierDirectoryDefinition[] = [
  {
    slug: "aliexpress",
    name: "AliExpress",
    origin: "China",
    homepageUrl: "https://www.aliexpress.com",
    categories: "all",
    coverageScore: 92,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "Low MOQ, huge SKU catalog. Integrated with DropHunter live search.",
    apiIntegrated: "aliexpress",
    buildSearchUrl: (q) => `https://www.aliexpress.com/wholesale?SearchText=${plus(q)}`,
  },
  {
    slug: "cj",
    name: "CJ Dropshipping",
    origin: "China",
    homepageUrl: "https://cjdropshipping.com",
    categories: "all",
    coverageScore: 90,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "US/EU warehouses, sourcing agents, and fulfillment. Integrated with DropHunter.",
    apiIntegrated: "cj",
    buildSearchUrl: (q) => `https://cjdropshipping.com/search?q=${plus(q)}`,
  },
  {
    slug: "1688",
    name: "1688.com",
    origin: "China",
    homepageUrl: "https://www.1688.com",
    categories: "all",
    coverageScore: 88,
    regions: ["GLOBAL"],
    notes: "Alibaba's domestic B2B marketplace — lowest factory pricing (Chinese UI; use a sourcing agent).",
    buildSearchUrl: (q) => `https://s.1688.com/selloffer/offer_search.htm?keywords=${enc(q)}`,
  },
  {
    slug: "alibaba",
    name: "Alibaba.com",
    origin: "Global",
    homepageUrl: "https://www.alibaba.com",
    categories: "all",
    coverageScore: 87,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "Global B2B platform for manufacturers and bulk orders.",
    buildSearchUrl: (q) => `https://www.alibaba.com/trade/search?SearchText=${enc(q)}`,
  },
  {
    slug: "dhgate",
    name: "DHgate",
    origin: "China",
    homepageUrl: "https://www.dhgate.com",
    categories: "all",
    coverageScore: 85,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "Wholesale marketplace with buyer protection and smaller MOQs than Alibaba.",
    buildSearchUrl: (q) =>
      `https://www.dhgate.com/wholesale/search.do?searchkey=${enc(q)}&searchSource=sort&sortType=bestmatch`,
  },
  {
    slug: "banggood",
    name: "Banggood",
    origin: "China",
    homepageUrl: "https://www.banggood.com",
    categories: ["electronics", "home", "sports", "toys", "tools", "automotive", "garden"],
    coverageScore: 83,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "Strong for gadgets, RC, tools, and hobby niches with dropship program.",
    buildSearchUrl: (q) =>
      `https://www.banggood.com/search/${enc(q).replace(/%20/g, "-")}.html`,
  },
  {
    slug: "made-in-china",
    name: "Made-in-China.com",
    origin: "China",
    homepageUrl: "https://www.made-in-china.com",
    categories: "all",
    coverageScore: 82,
    regions: ["GLOBAL"],
    notes: "B2B directory focused on Chinese factories and OEM suppliers.",
    buildSearchUrl: (q) => `https://www.made-in-china.com/productdirectory.do?word=${plus(q)}`,
  },
  {
    slug: "globalsources",
    name: "Global Sources",
    origin: "Hong Kong",
    homepageUrl: "https://www.globalsources.com",
    categories: ["electronics", "home", "fashion", "tools", "office", "automotive"],
    coverageScore: 80,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "Verified suppliers from trade shows — good for electronics and home goods.",
    buildSearchUrl: (q) => `https://www.globalsources.com/search?keyword=${enc(q)}`,
  },
  {
    slug: "eprolo",
    name: "EPROLO",
    origin: "China",
    homepageUrl: "https://eprolo.com",
    categories: ["fashion", "home", "beauty", "jewelry", "pet", "electronics"],
    coverageScore: 79,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "Dropship fulfillment with branding and US/EU shipping options.",
    buildSearchUrl: (q) => `https://eprolo.com/search?keyword=${enc(q)}`,
  },
  {
    slug: "hypersku",
    name: "HyperSKU",
    origin: "China",
    homepageUrl: "https://hypersku.com",
    categories: ["fashion", "home", "beauty", "electronics", "jewelry"],
    coverageScore: 78,
    regions: ["US", "UK", "GLOBAL"],
    notes: "Sourcing plus 3PL with quality inspection for Shopify sellers.",
    buildSearchUrl: (q) => `https://hypersku.com/search?q=${enc(q)}`,
  },
  {
    slug: "zendrop",
    name: "Zendrop",
    origin: "US",
    homepageUrl: "https://zendrop.com",
    categories: ["fashion", "home", "beauty", "pet", "jewelry", "health"],
    coverageScore: 77,
    regions: ["US", "GLOBAL"],
    notes: "US-focused fulfillment with vetted suppliers and fast domestic shipping.",
    buildSearchUrl: (q) => `https://zendrop.com/catalog?search=${enc(q)}`,
  },
  {
    slug: "saleyee",
    name: "SaleYee",
    origin: "EU",
    homepageUrl: "https://www.saleyee.com",
    categories: ["home", "garden", "fashion", "beauty", "pet", "sports", "tools"],
    coverageScore: 76,
    regions: ["US", "UK", "EU"],
    notes: "EU and US warehouse inventory for faster delivery to Western buyers.",
    buildSearchUrl: (q) => `https://www.saleyee.com/search?q=${enc(q)}`,
  },
  {
    slug: "spocket",
    name: "Spocket",
    origin: "US",
    homepageUrl: "https://www.spocket.co",
    categories: ["home", "beauty", "fashion", "jewelry", "pet", "baby", "health"],
    coverageScore: 75,
    regions: ["US", "UK", "EU"],
    notes: "US and EU suppliers with 2–7 day shipping for premium niches.",
    buildSearchUrl: (q) => `https://www.spocket.co/search?query=${enc(q)}`,
  },
  {
    slug: "printful",
    name: "Printful",
    origin: "Global",
    homepageUrl: "https://www.printful.com",
    categories: ["fashion", "home", "office", "beauty", "sports"],
    coverageScore: 74,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "Print-on-demand — apparel, mugs, posters with no inventory.",
    buildSearchUrl: (q) => `https://www.printful.com/search?q=${enc(q)}`,
  },
  {
    slug: "printify",
    name: "Printify",
    origin: "Global",
    homepageUrl: "https://printify.com",
    categories: ["fashion", "home", "office", "beauty", "sports"],
    coverageScore: 73,
    regions: ["US", "UK", "EU", "GLOBAL"],
    notes: "POD network with multiple print providers worldwide.",
    buildSearchUrl: (q) => `https://printify.com/app/products?search=${enc(q)}`,
  },
  {
    slug: "faire",
    name: "Faire",
    origin: "US",
    homepageUrl: "https://www.faire.com",
    categories: ["home", "beauty", "fashion", "jewelry", "baby", "pet", "office"],
    coverageScore: 72,
    regions: ["US", "UK", "EU"],
    notes: "Independent brands and wholesale makers — great for unique catalog items.",
    buildSearchUrl: (q) => `https://www.faire.com/search?q=${enc(q)}`,
  },
  {
    slug: "wholesale2b",
    name: "Wholesale2B",
    origin: "US",
    homepageUrl: "https://www.wholesale2b.com",
    categories: "all",
    coverageScore: 71,
    regions: ["US", "GLOBAL"],
    notes: "Aggregates US dropship catalogs (Amazon, Walmart, etc.) in one place.",
    buildSearchUrl: (q) => `https://www.wholesale2b.com/search?q=${enc(q)}`,
  },
  {
    slug: "lazada",
    name: "Lazada",
    origin: "SEA",
    homepageUrl: "https://www.lazada.com",
    categories: ["electronics", "home", "fashion", "beauty", "sports", "toys", "health"],
    coverageScore: 70,
    regions: ["SEA", "GLOBAL"],
    notes: "Leading marketplace in Southeast Asia — useful for APAC expansion.",
    buildSearchUrl: (q) => `https://www.lazada.com/catalog/?q=${enc(q)}`,
  },
];

export function filterSuppliersByCategory(
  category?: ProductCategory
): SupplierDirectoryDefinition[] {
  if (!category) {
    return [...GLOBAL_SUPPLIER_DIRECTORY].sort((a, b) => b.coverageScore - a.coverageScore);
  }
  return GLOBAL_SUPPLIER_DIRECTORY.filter((s) => supplierCoversCategory(s, category)).sort(
    (a, b) => b.coverageScore - a.coverageScore
  );
}

export function listSupplierDirectoryCategories(): ProductCategory[] {
  return [...PRODUCT_CATEGORIES];
}
