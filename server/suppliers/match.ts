import type { ProductOffer, ProductSearchResult, SupplierMatchState } from "@shared/searchTypes";

export type SupplierMatchResult = {
  matchState: SupplierMatchState;
  message: string;

};



function tokenize(text: string): Set<string> {

  return new Set(

    text

      .toLowerCase()

      .replace(/[^a-z0-9\s]/g, " ")

      .split(/\s+/)

      .filter((t) => t.length > 2)

  );

}



function titleSimilarity(a: string, b: string): number {

  const ta = tokenize(a);

  const tb = tokenize(b);

  if (ta.size === 0 || tb.size === 0) return 0;

  let hits = 0;

  for (const t of Array.from(ta)) {

    if (tb.has(t)) hits += 1;

  }

  return hits / Math.max(ta.size, tb.size);

}



function priceBandMatch(listingPrice: number, offerCost: number): boolean {

  if (listingPrice <= 0 || offerCost <= 0) return false;

  const ratio = offerCost / listingPrice;

  return ratio >= 0.15 && ratio <= 1.3;

}



export function computeSupplierMatch(

  product: Pick<ProductSearchResult, "title" | "price" | "category">,

  offers: ProductOffer[]

): SupplierMatchResult {

  if (offers.length === 0) {

    return {

      matchState: "none",

      message: "No supplier offers found — search CJ, AliExpress, or Taobao manually.",

    };

  }



  const best = offers[0];

  const similarity = titleSimilarity(product.title, best.productTitle);



  if (similarity >= 0.45) {

    return {

      matchState: "exact",

      message: "Strong title match to supplier listing.",

    };

  }



  const categoryAligned =

    product.category &&

    best.productTitle.toLowerCase().includes(product.category.toLowerCase());

  const priceAligned = priceBandMatch(product.price, best.landedCost);



  if (categoryAligned || priceAligned || similarity >= 0.2) {

    return {

      matchState: "similar",

      message: "Related supplier offers — verify SKU and specs before sourcing.",

    };

  }



  return {

    matchState: "none",

    message: "No confident supplier match — verify manually before using these costs.",

  };

}


