import type { ProductSearchResult, RegionCode } from "@shared/searchTypes";
import type { SearchProviderId } from "@shared/searchTypes";
import { normalizeProduct } from "../normalize";
import { resolveRegion } from "../regions";

export function parseMoney(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function productFromFields(
  fields: {
    id: string;
    title: string;
    price?: unknown;
    image?: string | null;
    url?: string | null;
    rating?: number | null;
    reviews?: number | null;
    platform?: string;
    supplier?: string;
    category?: string;
  },
  region: RegionCode | undefined,
  sourceProvider: SearchProviderId
): ProductSearchResult {
  const mapping = resolveRegion(region);
  const price =
    fields.price != null
      ? parseMoney(fields.price)
      : 0;

  const normalized = normalizeProduct(
    {
      id: fields.id,
      title: fields.title,
      price,
      platform: fields.platform ?? "shopify",
      image: fields.image ?? null,
      shippingDays: null,
      supplier: fields.supplier ?? "RapidAPI",
      rating: fields.rating ?? null,
      sourceUrl: fields.url ?? null,
      currency: mapping.currency,
      category: fields.category,
      sourceProvider,
    },
    region,
    { strictTruth: false }
  );
  return normalized!;
}
