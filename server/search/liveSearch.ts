import type {
  ProductHuntFilters,
  ProductSearchResponse,
  ProductCategory,
  RegionCode,
  SearchProviderAvailability,
  SearchProviderId,
} from "@shared/searchTypes";
import { PRODUCT_CATEGORIES } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import { applyProductHuntFilters } from "./filters";
import { dedupeResults, type SearchPlatform } from "./utils";
import { normalizeProducts } from "./normalize";
import { mergeSearchResults, persistListings } from "../dataPlatform/productGraph";
import { getStrictTruthMode, isFreeRetailAllowed, allowsHeuristicTrendScores } from "../truthMode";
import {
  CATEGORY_PROVIDER_ROUTING,
  getCategoryProviderOrder,
} from "./categories";
import { computePerProviderCap } from "./constants";
import {
  getSearchProviderDefinitions,
  getProviderLabel,
  resolveProviderUnavailableReason,
  shouldIncludeProvider,
} from "./providerRegistry";
import { canUseProviderNow } from "../dataPlatform/providerBudget";
import { searchCj } from "./cj";
import { searchShoptera } from "./shoptera";

type ProviderSpec = {
  id: SearchProviderId;
  include: boolean;
  configured: boolean;
  run: (query: string, maxResults: number) => Promise<unknown[]>;
};

function isProductCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

function buildSearchQueries(trimmed: string, category?: string): string[] {
  const queries = [trimmed];
  if (!category || !isProductCategory(category)) return queries;

  const routing = CATEGORY_PROVIDER_ROUTING[category];
  if (!routing?.seeds?.length) return queries;

  for (const seed of routing.seeds) {
    const normalized = seed.trim();
    if (normalized && !queries.includes(normalized)) {
      queries.push(normalized);
    }
  }
  return queries;
}

function orderProviders(providers: ProviderSpec[], category?: string): ProviderSpec[] {
  const order = getCategoryProviderOrder(category);
  if (!order?.length) return providers;

  const rank = new Map(order.map((id, index) => [id, index]));
  return [...providers].sort((a, b) => {
    const ai = rank.get(a.id) ?? 999;
    const bi = rank.get(b.id) ?? 999;
    return ai - bi;
  });
}

export async function searchProductsLive(
  query: string,
  platform: SearchPlatform,
  filters?: ProductHuntFilters,
  options?: { ingest?: boolean }
): Promise<ProductSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], sources: [], isDemo: false };
  }

  const region = filters?.region ?? (ENV.defaultRegion as RegionCode);
  const category = filters?.category;
  const [freeRetailOk, allowHeuristic, strictTruth] = await Promise.all([
    isFreeRetailAllowed(),
    allowsHeuristicTrendScores(),
    getStrictTruthMode(),
  ]);

  const availability: SearchProviderAvailability[] = [];
  const providerSpecs: ProviderSpec[] = [];

  for (const definition of getSearchProviderDefinitions()) {
    const include = shouldIncludeProvider(definition, { platform, freeRetailOk });
    const configured = definition.isConfigured();
    const blockedByStrict = strictTruth && !configured;
    const reason = blockedByStrict
      ? "Unavailable"
      : resolveProviderUnavailableReason(definition, configured, {
          freeRetailBlocked: definition.id === "free_retail" && !freeRetailOk,
        });

    const availabilityRow: SearchProviderAvailability = {
      id: definition.id,
      label: getProviderLabel(definition.id),
      available: include && configured && !blockedByStrict,
      unavailableReason: include && configured && !blockedByStrict ? undefined : reason,
    };
    availability.push(availabilityRow);

    if (include && configured && !blockedByStrict) {
      const budgetOk = await canUseProviderNow(definition.id, { ingest: options?.ingest });
      if (!budgetOk) {
        availabilityRow.available = false;
        availabilityRow.unavailableReason =
          definition.tier === "free"
            ? "Free API hourly/daily cap reached — cached data used until next ingest cycle"
            : "Paid API daily cap reached";
        continue;
      }
      providerSpecs.push({
        id: definition.id,
        include,
        configured,
        run: (q, max) => {
          if (definition.id === "shoptera") {
            return searchShoptera(q, region, { ingest: options?.ingest });
          }
          if (definition.id === "cj") {
            return searchCj(q, region, { maxResults: max, ingest: options?.ingest });
          }
          return definition.search(q, region, max);
        },
      });
    }
  }

  const orderedProviders = orderProviders(providerSpecs, category);
  const searchQueries = buildSearchQueries(trimmed, category);
  const perFetchCap = Math.max(
    1,
    Math.ceil(
      computePerProviderCap(orderedProviders.length, ENV.trendingMaxItems) / searchQueries.length
    )
  );

  const tasks: Array<{
    source: SearchProviderId;
    label: string;
    run: () => Promise<unknown[]>;
  }> = [];

  for (const searchQuery of searchQueries) {
    for (const provider of orderedProviders) {
      tasks.push({
        source: provider.id,
        label: getProviderLabel(provider.id),
        run: () => provider.run(searchQuery, perFetchCap),
      });
    }
  }

  const settled = await Promise.allSettled(tasks.map((task) => task.run()));
  const sources: ProductSearchResponse["sources"] = [];
  const warnings: string[] = [];
  let results: ProductSearchResponse["results"] = [];

  settled.forEach((outcome, index) => {
    const task = tasks[index];
    if (!task) return;

    if (outcome.status === "fulfilled") {
      const normalized = normalizeProducts(
        outcome.value as Parameters<typeof normalizeProducts>[0],
        region,
        { allowHeuristicScores: allowHeuristic, strictTruth }
      ).map((p) => ({ ...p, sourceProvider: task.source }));

      if (normalized.length > 0) {
        if (!sources.includes(task.source)) {
          sources.push(task.source);
        }
        results = results.concat(normalized);
      }
    } else {
      console.error(`[Search] ${task.source} provider failed:`, outcome.reason);
      warnings.push(`${task.label} search failed — showing results from other providers`);
      const row = availability.find((a) => a.id === task.source);
      if (row) {
        row.available = false;
        row.unavailableReason = `${task.label} request failed`;
      }
    }
  });

  results = mergeSearchResults(dedupeResults(results));
  results.sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0));
  await persistListings(results, region);
  results = applyProductHuntFilters(dedupeResults(results), filters)
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
    .slice(0, ENV.trendingMaxItems);

  if (results.length === 0) {
    warnings.push("No results from configured providers for this query.");
  }

  return {
    results,
    sources,
    isDemo: false,
    dataMode: results.length > 0 ? "live" : undefined,
    cachedAt: new Date().toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined,
    providerAvailability: availability,
  };
}
