import type {

  DataMode,

  DataState,

  ProductSearchResult,

} from "@shared/searchTypes";

import { getProviderLiveTruthLabel } from "./providerRegistry";



type TruthContext = {

  dataMode?: DataMode;

  stale?: boolean;

  synthetic?: boolean;

  unavailable?: boolean;

};



export function resolveProductDataState(

  product: ProductSearchResult,

  ctx: TruthContext

): DataState {

  if (ctx.unavailable) return "unavailable";

  if (ctx.synthetic || product.sourceProvider === "free_retail") return "synthetic";

  if (ctx.dataMode === "live") return "live";

  if (ctx.stale) return "stale";

  return "cached";

}



export function resolveProductDataLabel(

  product: ProductSearchResult,

  ctx: TruthContext

): string {

  const state = product.dataState ?? resolveProductDataState(product, ctx);



  if (product.sourceProvider && state === "live") {

    return getProviderLiveTruthLabel(product.sourceProvider);

  }

  if (state === "live") return "Live listing";

  if (state === "stale") return "Stale cache";

  if (state === "synthetic") return "Demo catalog data";

  if (state === "unavailable") return "Data unavailable";

  if (product.sourceProvider) {

    return `Cached · ${product.sourceProvider.replace(/_/g, " ")}`;

  }

  return "Cached listing";

}



export function attachProductTruthLabels(

  product: ProductSearchResult,

  ctx: TruthContext = {}

): ProductSearchResult {

  const dataState = resolveProductDataState(product, ctx);

  const dataLabel = resolveProductDataLabel(product, { ...ctx, dataMode: ctx.dataMode });

  const inferredScores =

    product.inferredScores ??

    product.rankingExplanation?.inferredScores ??

    false;



  return {

    ...product,

    dataState,

    dataLabel,

    inferredScores,

  };

}



export function attachProductsTruthLabels(

  products: ProductSearchResult[],

  ctx: TruthContext = {}

): ProductSearchResult[] {

  return products.map((p) => attachProductTruthLabels(p, ctx));

}



export type ApiTruthContext = TruthContext & {

  dataMode?: DataMode;

  configured?: boolean;

  hasData?: boolean;

  live?: boolean;

};



export function resolveApiDataState(ctx: ApiTruthContext): DataState {

  if (ctx.unavailable || ctx.configured === false) return "unavailable";

  if (ctx.synthetic) return "synthetic";

  if (ctx.dataMode === "live" || ctx.live) return "live";

  if (ctx.stale) return "stale";

  if (ctx.hasData === false) return "unavailable";

  return "cached";

}



export function resolveApiDataLabel(ctx: ApiTruthContext): string {

  const state = resolveApiDataState(ctx);



  if (state === "live") return "Live data";

  if (state === "stale") return "Stale cache";

  if (state === "synthetic") return "Demo catalog data";

  if (state === "unavailable") return "Data unavailable";

  return "Cached data";

}



export function attachApiTruthLabels<T extends object>(

  payload: T,

  ctx: ApiTruthContext

): T & { dataState: DataState; dataLabel: string } {

  return {

    ...payload,

    dataState: resolveApiDataState(ctx),

    dataLabel: resolveApiDataLabel(ctx),

  };

}



export function attachOffersTruthLabels(

  response: import("@shared/searchTypes").ProductOffersResponse,

  configured: boolean

): import("@shared/searchTypes").ProductOffersResponse & {

  dataState: DataState;

  dataLabel: string;

} {

  const hasData = response.offers.length > 0;

  return attachApiTruthLabels(response, {

    dataMode: response.dataMode,

    stale: response.stale,

    configured,

    hasData,

    unavailable: !configured && !hasData,

  });

}



export function attachSearchResponseTruthLabels(

  response: import("@shared/searchTypes").ProductSearchResponse

): import("@shared/searchTypes").ProductSearchResponse & {

  dataState: DataState;

  dataLabel: string;

} {

  const hasData = response.results.length > 0;

  const unavailable = !hasData && response.providerAvailability?.every((p) => !p.available);

  return attachApiTruthLabels(response, {

    dataMode: response.dataMode,

    stale: response.stale,

    hasData,

    unavailable,

    synthetic: response.results.some((p) => p.dataState === "synthetic"),

  });

}

