import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import { scoreProduct, scoreProducts } from "../ranking/scoreProduct";

/** Blend momentum, ad saturation, margin, and supplier signals into trendScore. */
export async function fuseProductTrendScore(
  product: ProductSearchResult,
  region: RegionCode,
  options?: { forceTrending?: boolean; query?: string }
): Promise<ProductSearchResult> {
  return scoreProduct(product, region, {
    forceTrending: options?.forceTrending,
    query: options?.query,
    listingCount: product.alsoListedOn ? product.alsoListedOn.length + 1 : 1,
  });
}

export async function fuseProductTrendScores(
  products: ProductSearchResult[],
  region: RegionCode,
  options?: { forceTrending?: boolean; query?: string }
): Promise<ProductSearchResult[]> {
  return scoreProducts(products, region, options);
}
