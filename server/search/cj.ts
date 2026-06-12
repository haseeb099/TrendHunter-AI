import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { queryCjProducts } from "../suppliers/cj";
import { isCjApiConfigured } from "../suppliers/cj";
import { getStrictTruthMode } from "../truthMode";
import { PROVIDER_FETCH_LIMIT } from "./constants";
import { normalizeProduct } from "./normalize";
import { resolveRegion } from "./regions";

export function isCjSearchConfigured() {
  return isCjApiConfigured();
}

function mapCjProduct(
  item: Record<string, unknown>,
  index: number,
  region: RegionCode | undefined,
  currency: string,
  strictTruth: boolean
): ProductSearchResult | null {
  const productId = String(item.pid ?? item.productSku ?? index);
  const warehouse = String(item.warehouse ?? "");
  const shipFrom =
    warehouse === "US" || warehouse === "UK" || warehouse === "CN" || warehouse === "EU"
      ? warehouse
      : resolveRegion(region).aliexpressShipFrom;

  const priceRaw = item.sellPrice ?? item.productPrice;
  const price: number | string =
    typeof priceRaw === "number" || typeof priceRaw === "string"
      ? priceRaw
      : strictTruth
        ? "N/A"
        : 0;

  const deliveryMax = item.deliveryTimeMax ?? item.deliveryTimeMin;
  const imageSet = item.productImageSet;
  const imageUrl =
    item.productImage ??
    item.bigImage ??
    (Array.isArray(imageSet) && imageSet.length > 0 ? imageSet[0] : null);

  return normalizeProduct(
    {
      id: productId,
      title: String(item.productNameEn ?? item.productName ?? "CJ product"),
      price,
      platform: "cj",
      image: imageUrl ? String(imageUrl) : null,
      shippingDays:
        deliveryMax != null && Number.isFinite(Number(deliveryMax))
          ? Number(deliveryMax)
          : null,
      supplier: "CJ Dropshipping",
      rating: null,
      sourceUrl: item.productUrl ? String(item.productUrl) : null,
      currency,
      region,
      shipFrom,
      warehouse: warehouse || shipFrom,
      moq: item.moq != null ? Number(item.moq) : undefined,
    },
    region,
    { strictTruth, allowHeuristicScores: false }
  );
}

export async function searchCj(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number; ingest?: boolean }
): Promise<ProductSearchResult[]> {
  if (!isCjSearchConfigured()) return [];

  const maxResults = options?.maxResults ?? PROVIDER_FETCH_LIMIT;
  const mapping = resolveRegion(region);
  const strictTruth = await getStrictTruthMode();
  const results: ProductSearchResult[] = [];
  let pageNum = 1;

  while (results.length < maxResults) {
    const pageSize = Math.min(PROVIDER_FETCH_LIMIT, maxResults - results.length);
    const { products, live } = await queryCjProducts(query, {
      pageSize,
      pageNum,
      region,
      countryCode: mapping.cjCountryCode,
      ingest: options?.ingest,
    });
    if (!live || products.length === 0) break;

    for (let i = 0; i < products.length; i += 1) {
      const item = products[i]!;
      const mapped = mapCjProduct(item, i, region, mapping.currency, strictTruth);
      if (mapped) results.push(mapped);
    }

    if (products.length < pageSize) break;
    pageNum += 1;
  }

  return results.slice(0, maxResults);
}
