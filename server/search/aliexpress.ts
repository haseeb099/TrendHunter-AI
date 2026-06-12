import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { isAliExpressConfigured } from "../_core/env";
import { queryAliExpressProducts } from "../suppliers/aliexpress";
import { getStrictTruthMode } from "../truthMode";
import { PROVIDER_FETCH_LIMIT } from "./constants";
import { normalizeProduct } from "./normalize";
import { resolveRegion } from "./regions";

export function isAliExpressSearchConfigured() {
  return isAliExpressConfigured();
}

function mapAliExpressProduct(
  item: Record<string, unknown>,
  index: number,
  region: RegionCode | undefined,
  currency: string,
  strictTruth: boolean
): ProductSearchResult | null {
  const productId = String(item.product_id ?? index);
  const shipFrom = resolveRegion(region).aliexpressShipFrom;
  const link = item.product_detail_url ?? item.promotion_link;
  const priceRaw = item.target_sale_price ?? item.sale_price;
  const deliveryRaw = item.delivery_days_max ?? item.delivery_days_min;
  const price: number | string =
    typeof priceRaw === "number" || typeof priceRaw === "string"
      ? priceRaw
      : strictTruth
        ? "N/A"
        : 0;

  return normalizeProduct(
    {
      id: productId,
      title: String(item.product_title ?? "AliExpress product"),
      price,
      platform: "aliexpress",
      image: item.product_main_image_url ? String(item.product_main_image_url) : null,
      shippingDays:
        deliveryRaw != null && Number.isFinite(Number(deliveryRaw))
          ? Number(deliveryRaw)
          : null,
      supplier: "AliExpress",
      rating: item.evaluate_rate ? Number(item.evaluate_rate) : null,
      sourceUrl: link ? String(link) : null,
      currency,
      region,
      shipFrom,
      warehouse: shipFrom,
    },
    region,
    { strictTruth, allowHeuristicScores: false }
  );
}

export async function searchAliExpress(
  query: string,
  region?: RegionCode,
  options?: { maxResults?: number }
): Promise<ProductSearchResult[]> {
  if (!isAliExpressSearchConfigured()) return [];

  const maxResults = options?.maxResults ?? PROVIDER_FETCH_LIMIT;
  const mapping = resolveRegion(region);
  const strictTruth = await getStrictTruthMode();
  const results: ProductSearchResult[] = [];
  let pageNo = 1;

  while (results.length < maxResults) {
    const pageSize = Math.min(PROVIDER_FETCH_LIMIT, maxResults - results.length);
    const { products, live } = await queryAliExpressProducts(query, { pageSize, pageNo });
    if (!live || products.length === 0) break;

    for (let i = 0; i < products.length; i += 1) {
      const item = products[i]!;
      const mapped = mapAliExpressProduct(item, i, region, mapping.currency, strictTruth);
      if (mapped) results.push(mapped);
    }

    if (products.length < pageSize) break;
    pageNo += 1;
  }

  return results.slice(0, maxResults);
}
