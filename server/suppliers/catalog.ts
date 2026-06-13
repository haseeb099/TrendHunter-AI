import type { ProductCategory, RegionCode } from "@shared/searchTypes";
import {
  categorySearchQuery,
  DEFAULT_SUPPLIER_SEARCH_QUERY,
  filterSuppliersByCategory,
  type SupplierDirectoryDefinition,
} from "@shared/supplierDirectory";
import { isCjApiConfigured, queryCjProducts } from "./cj";
import { isAliExpressApiConfigured, queryAliExpressProducts } from "./aliexpress";

export type SupplierCatalogSample = {
  title: string;
  url: string;
  price?: number;
  image?: string | null;
};

export type SupplierCatalogView = {
  id: string;
  slug: string;
  name: string;
  origin: string;
  platform: string;
  category: string;
  subcategory: string | null;
  homepageUrl: string;
  coverageScore: number;
  regions: string[];
  searchUrl: string;
  notes: string | null;
  categories: ProductCategory[] | "all";
  apiIntegrated: boolean;
  samples: SupplierCatalogSample[];
  liveSamples: boolean;
};

function mapCjSample(item: Record<string, unknown>, fallbackTitle: string): SupplierCatalogSample | null {
  const title = String(item.productNameEn ?? item.productName ?? fallbackTitle).trim();
  const pid = item.pid ?? item.productSku;
  const href = item.productUrl ?? item.href ?? item.productHref;
  const url =
    typeof href === "string" && href.startsWith("http")
      ? href
      : pid
        ? `https://cjdropshipping.com/product-detail.html?pid=${encodeURIComponent(String(pid))}`
        : null;
  if (!url || !title) return null;
  const price = Number(item.sellPrice ?? item.productPrice);
  return {
    title: title.slice(0, 120),
    url,
    price: Number.isFinite(price) && price > 0 ? price : undefined,
    image: typeof item.productImage === "string" ? item.productImage : null,
  };
}

function mapAliExpressSample(item: Record<string, unknown>, fallbackTitle: string): SupplierCatalogSample | null {
  const title = String(item.product_title ?? item.productTitle ?? fallbackTitle).trim();
  const detailUrl = item.product_detail_url ?? item.promotion_link ?? item.product_url;
  const productId = item.product_id;
  const url =
    typeof detailUrl === "string" && detailUrl.startsWith("http")
      ? detailUrl
      : productId
        ? `https://www.aliexpress.com/item/${productId}.html`
        : null;
  if (!url || !title) return null;
  const price = Number(item.target_sale_price ?? item.sale_price);
  return {
    title: title.slice(0, 120),
    url,
    price: Number.isFinite(price) && price > 0 ? price : undefined,
    image: typeof item.product_main_image_url === "string" ? item.product_main_image_url : null,
  };
}

const sampleCache = new Map<string, { expiresAt: number; samples: SupplierCatalogSample[] }>();
const SAMPLE_CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchLiveSamples(
  apiPlatform: "cj" | "aliexpress",
  query: string,
  region: RegionCode
): Promise<SupplierCatalogSample[]> {
  const cacheKey = `${apiPlatform}:${query}:${region}`;
  const cached = sampleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.samples;
  }

  let samples: SupplierCatalogSample[] = [];

  if (apiPlatform === "cj" && isCjApiConfigured()) {
    const { products, live } = await queryCjProducts(query, { pageSize: 4, pageNum: 1, region });
    if (live) {
      samples = products
        .map((item) => mapCjSample(item, query))
        .filter((s): s is SupplierCatalogSample => Boolean(s))
        .slice(0, 4);
    }
  } else if (apiPlatform === "aliexpress" && isAliExpressApiConfigured()) {
    const { products, live } = await queryAliExpressProducts(query, { pageSize: 4, pageNo: 1 });
    if (live) {
      samples = products
        .map((item) => mapAliExpressSample(item, query))
        .filter((s): s is SupplierCatalogSample => Boolean(s))
        .slice(0, 4);
    }
  }

  if (samples.length > 0) {
    sampleCache.set(cacheKey, { samples, expiresAt: Date.now() + SAMPLE_CACHE_TTL_MS });
  }

  return samples;
}

function buildCatalogEntry(
  supplier: SupplierDirectoryDefinition,
  options: {
    category?: ProductCategory;
    query: string;
    samples: SupplierCatalogSample[];
  }
): SupplierCatalogView {
  const { category, query, samples } = options;
  return {
    id: supplier.slug,
    slug: supplier.slug,
    name: supplier.name,
    origin: supplier.origin,
    platform: supplier.apiIntegrated ?? supplier.slug,
    category: category ?? "general",
    subcategory: category ? categorySearchQuery(category) : null,
    homepageUrl: supplier.homepageUrl,
    coverageScore: supplier.coverageScore,
    regions: supplier.regions,
    searchUrl: supplier.buildSearchUrl(query),
    notes: supplier.notes,
    categories: supplier.categories,
    apiIntegrated: Boolean(supplier.apiIntegrated),
    samples,
    liveSamples: samples.length > 0,
  };
}

export async function getEnrichedSupplierCatalog(options?: {
  category?: string;
  region?: RegionCode;
  includeLiveSamples?: boolean;
}): Promise<SupplierCatalogView[]> {
  const category = options?.category as ProductCategory | undefined;
  const region = options?.region ?? "US";
  const includeLiveSamples = options?.includeLiveSamples ?? true;
  const query = category ? categorySearchQuery(category) : DEFAULT_SUPPLIER_SEARCH_QUERY;
  const suppliers = filterSuppliersByCategory(category);
  const canFetchLive =
    includeLiveSamples &&
    Boolean(category) &&
    (isCjApiConfigured() || isAliExpressApiConfigured());

  const enriched: SupplierCatalogView[] = [];

  for (const supplier of suppliers) {
    let samples: SupplierCatalogSample[] = [];
    if (canFetchLive && supplier.apiIntegrated) {
      samples = await fetchLiveSamples(supplier.apiIntegrated, query, region);
    }
    enriched.push(buildCatalogEntry(supplier, { category, query, samples }));
  }

  return enriched;
}
