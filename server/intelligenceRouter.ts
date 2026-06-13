import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "./_core/trpc";
import { featureProcedure, intelReadProcedure, protectedBase } from "./_core/planMiddleware";

const intelProcedure = featureProcedure("discover");
import { getCtxUser } from "./_core/trpc";
import { assertRateLimit, getClientIp } from "./_core/rateLimit";
import { isBillableLiveFetch, spendCredits } from "./credits";
import { getTrendSignal } from "./intelligence/trends";
import { isTrendIntelConfigured, getIntelProviderStatus } from "./intelligence/providers";
import { getAdLibrarySnapshot, isMetaAdLibraryConfigured } from "./intelligence/adLibrary";
import {
  getTikTokAdsSnapshot,
  isTikTokAdsConfigured,
  listTikTokAdKeywords,
  tikTokAdsProvider,
} from "./intelligence/tiktokAds";
import { getProductIntelligence, buildIntelligenceContext } from "./intelligence/summary";
import { attachProductsTruthLabels, attachApiTruthLabels } from "./search/truthLabels";
import { buildMarketDigest, listTrendingKeywords, listAdRadarKeywords, listTikTokDigestKeywords } from "./intelligence/marketDigest";
import { warmRegionIntelCache, regionHasIntelCache } from "./intelligence/intelWarm";
import {
  getLatestIngestRun,
  getKeywordWatches,
  countKeywordWatches,
  addKeywordWatch,
  removeKeywordWatch,
  getDigestPrefs,
  upsertDigestPrefs,
  getRecentIntelAlerts,
} from "./db";
import { resolveEffectivePlan } from "./plans";
import { canAddKeywordWatch, keywordWatchLimit } from "@shared/intelAlerts";
import { isEmailConfigured } from "./notifications/email";
import { ENV } from "./_core/env";
import { sanitizeKeyword } from "@shared/keywordUtils";
import { normalizeIntelKeyword } from "@shared/intelKeyword";
import type { RegionCode } from "@shared/searchTypes";
import type { TrendWindow } from "@shared/intelligenceTypes";
import { searchTikTok, isTikTokConfigured } from "./search/tiktok";
import {
  getCachedAmazonCategories,
  syncAmazonCategoriesFromRapidApi,
} from "./search/amazonCategorySync";
import {
  fetchAmazonProductCategoryList,
  getRapidAmazonMonthlyUsage,
  isRapidAmazonConfigured,
} from "./search/rapidAmazon";

const regionSchema = z.enum(["US", "UK", "EU", "GLOBAL"]);
const timeframeSchema = z.enum(["7d", "30d", "90d"]);

function requireKeyword(raw: string): string {
  const keyword = sanitizeKeyword(raw);
  if (!keyword) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Keyword is required" });
  }
  return normalizeIntelKeyword(keyword) || keyword;
}

export const intelligenceRouter = router({
  getTrendPulse: intelReadProcedure()
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
        live: z.boolean().optional(),
        timeframe: timeframeSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const keyword = requireKeyword(input.keyword);
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      let creditsUsed = 0;

      const signal = await getTrendSignal(keyword, region, {
        live: input.live,
        timeframe: input.timeframe as TrendWindow | undefined,
      });
      if (input.live && isBillableLiveFetch(signal)) {
        creditsUsed = await spendCredits(getCtxUser(ctx), "trends_live", { keyword });
      }
      return attachApiTruthLabels(
        { signal, creditsUsed, region, configured: isTrendIntelConfigured() },
        {
          configured: isTrendIntelConfigured(),
          hasData: Boolean(signal),
          live: Boolean(input.live),
          stale: signal?.stale,
        }
      );
    }),

  getAdRadar: intelReadProcedure()
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
        live: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const keyword = requireKeyword(input.keyword);
      const region = input.region ?? ENV.defaultRegion;
      let creditsUsed = 0;

      const snapshot = await getAdLibrarySnapshot(keyword, region, { live: input.live });
      if (input.live && isBillableLiveFetch(snapshot)) {
        creditsUsed = await spendCredits(getCtxUser(ctx), "ad_library_live", { keyword });
      }
      const configured = isMetaAdLibraryConfigured();
      return attachApiTruthLabels(
        {
          snapshot,
          creditsUsed,
          configured,
        },
        {
          configured,
          hasData: Boolean(snapshot),
          live: Boolean(input.live),
          stale: snapshot?.stale,
        }
      );
    }),

  getTikTokRadar: intelReadProcedure()
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
        live: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const keyword = requireKeyword(input.keyword);
      const region = input.region ?? ENV.defaultRegion;
      let creditsUsed = 0;

      const snapshot = await getTikTokAdsSnapshot(keyword, region, { live: input.live });
      if (input.live && isBillableLiveFetch(snapshot)) {
        creditsUsed = await spendCredits(getCtxUser(ctx), "tiktok_ads_live", { keyword });
      }
      const configured = isTikTokAdsConfigured();
      return attachApiTruthLabels(
        {
          snapshot,
          creditsUsed,
          configured,
          provider: tikTokAdsProvider(),
        },
        {
          configured,
          hasData: Boolean(snapshot),
          live: Boolean(input.live),
          stale: snapshot?.stale,
        }
      );
    }),

  listTikTokKeywords: intelProcedure
    .input(
      z.object({
        region: regionSchema.optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).optional(),
      })
    )
    .query(({ input }) => {
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      return listTikTokDigestKeywords(region, input.limit ?? 24, input.category);
    }),

  warmIntelCache: intelProcedure
    .input(z.object({ region: regionSchema.optional(), force: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      return warmRegionIntelCache(region, { force: input.force });
    }),

  getProviderStatus: intelProcedure.query(() => getIntelProviderStatus()),

  /** TikTok Shop product trends — separate from TikTok Ads radar */
  getTikTokShopTrends: intelProcedure
    .input(
      z.object({
        keyword: z.string().min(1).optional(),
        region: regionSchema.optional(),
        limit: z.number().min(1).max(50).optional(),
      })
    )
    .query(async ({ input }) => {
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      const keyword = input.keyword ? requireKeyword(input.keyword) : "trending";
      const limit = input.limit ?? 24;

      if (!isTikTokConfigured()) {
        return attachApiTruthLabels(
          {
            region,
            keyword,
            configured: false,
            products: [] as Array<{
              id: string;
              title: string;
              price: number;
              image: string | null;
              platform: string;
              dataState?: import("@shared/searchTypes").DataState;
              dataLabel?: string;
              inferredScores?: boolean;
              isTrending?: boolean | null;
            }>,
            message: "TikTok Shop API not configured — add TIKTOK_SHOP_API_KEY or official TikTok credentials.",
          },
          { configured: false, hasData: false, unavailable: true }
        );
      }

      try {
        const results = await searchTikTok(keyword, region);
        const labeled = attachProductsTruthLabels(results, { dataMode: "live" });
        return attachApiTruthLabels(
          {
            region,
            keyword,
            configured: true,
            products: labeled.slice(0, limit).map((p) => ({
              id: p.id,
              title: p.title,
              price: p.price,
              image: p.image,
              platform: p.platform,
              dataState: p.dataState,
              dataLabel: p.dataLabel,
              inferredScores: p.inferredScores,
              isTrending: p.isTrending,
            })),
            fetchedAt: new Date().toISOString(),
            message:
              labeled.length === 0
                ? "No TikTok Shop products found for this keyword. Try a broader search term."
                : undefined,
          },
          {
            configured: true,
            hasData: labeled.length > 0,
            live: true,
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "TikTok Shop search failed";
        return attachApiTruthLabels(
          {
            region,
            keyword,
            configured: true,
            products: [],
            message,
          },
          { configured: true, hasData: false, unavailable: true }
        );
      }
    }),

  getProductIntel: intelProcedure
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
        timeframe: timeframeSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      const keyword = requireKeyword(input.keyword);
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      const summary = await getProductIntelligence(keyword, region, {
        timeframe: input.timeframe as TrendWindow | undefined,
      });
      return attachApiTruthLabels(summary, {
        configured:
          isTrendIntelConfigured() || isMetaAdLibraryConfigured() || isTikTokAdsConfigured(),
        hasData: summary.fetchedAt != null,
        stale: summary.stale,
      });
    }),

  getIntelligenceContext: intelProcedure
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      const keyword = requireKeyword(input.keyword);
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      const [trend, ads] = await Promise.all([
        getTrendSignal(keyword, region),
        getAdLibrarySnapshot(keyword, region),
      ]);
      return attachApiTruthLabels(
        {
          context: buildIntelligenceContext(keyword, trend, ads),
          trend,
          ads,
        },
        {
          configured:
            isTrendIntelConfigured() || isMetaAdLibraryConfigured() || isTikTokAdsConfigured(),
          hasData: Boolean(trend || ads),
          stale: Boolean(trend?.stale || ads?.stale),
        }
      );
    }),

  /** Cached keyword lists for Intel Center & sidebar pages */
  getMarketDigest: intelProcedure
    .input(
      z.object({
        region: regionSchema.optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      const hasCache = await regionHasIntelCache(region);
      if (!hasCache) {
        void warmRegionIntelCache(region, { background: true });
      }
      const digest = await buildMarketDigest(region, input.category);
      const ingest = await getLatestIngestRun();
      const providers = getIntelProviderStatus();
      return {
        region,
        ...digest,
        metaConfigured: providers.meta,
        serpConfigured: providers.trends,
        tiktokConfigured: providers.tiktokAds,
        warming: !hasCache,
        lastIngestAt: ingest?.completedAt?.toISOString() ?? ingest?.startedAt.toISOString() ?? null,
        cacheTtlHours: ENV.trendingCacheTtlHours,
      };
    }),

  listTrendKeywords: intelProcedure
    .input(
      z.object({
        region: regionSchema.optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).optional(),
      })
    )
    .query(({ input }) => {
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      return listTrendingKeywords(region, input.limit ?? 24, input.category);
    }),

  listAdKeywords: intelProcedure
    .input(
      z.object({
        region: regionSchema.optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).optional(),
      })
    )
    .query(({ input }) => {
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      return listAdRadarKeywords(region, input.limit ?? 24, input.category);
    }),

  getKeywordWatches: protectedBase.query(async ({ ctx }) => {
    const userId = getCtxUser(ctx).id;
    const rows = await getKeywordWatches(userId);
    const plan = resolveEffectivePlan(getCtxUser(ctx)).effectivePlanId;
    return {
      watches: rows.map((r) => ({
        id: r.id,
        keyword: r.keyword,
        region: r.region,
        lastMomentumLabel: r.lastMomentumLabel,
        alertOnRising: r.alertOnRising,
        createdAt: r.createdAt.toISOString(),
      })),
      limit: keywordWatchLimit(plan),
      count: rows.length,
    };
  }),

  addKeywordWatch: protectedBase
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = getCtxUser(ctx);
      const keyword = requireKeyword(input.keyword).toLowerCase();
      const region = input.region ?? ENV.defaultRegion;
      const plan = resolveEffectivePlan(user).effectivePlanId;
      const count = await countKeywordWatches(user.id);
      if (!canAddKeywordWatch(plan, count)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Keyword watch limit reached (${keywordWatchLimit(plan)} on your plan).`,
        });
      }
      const signal = await getTrendSignal(keyword, region as RegionCode);
      const id = await addKeywordWatch({
        userId: user.id,
        keyword,
        region,
        lastMomentumLabel: signal?.momentumLabel ?? null,
        alertOnRising: true,
      });
      return { id };
    }),

  removeKeywordWatch: protectedBase
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeKeywordWatch(input.id, getCtxUser(ctx).id);
      return { ok: true };
    }),

  getDigestPrefs: protectedBase.query(async ({ ctx }) => {
    const prefs = await getDigestPrefs(getCtxUser(ctx).id);
    return {
      enabled: prefs?.enabled ?? false,
      region: (prefs?.region ?? ENV.defaultRegion) as RegionCode,
      category: prefs?.category ?? null,
      lastSentAt: prefs?.lastSentAt?.toISOString() ?? null,
      emailConfigured: isEmailConfigured(),
    };
  }),

  updateDigestPrefs: protectedBase
    .input(
      z.object({
        enabled: z.boolean(),
        region: regionSchema.optional(),
        category: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = getCtxUser(ctx);
      if (input.enabled && !user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add an email to your account before enabling digests.",
        });
      }
      await upsertDigestPrefs(user.id, {
        enabled: input.enabled,
        region: input.region ?? ENV.defaultRegion,
        category: input.category ?? null,
      });
      return { ok: true };
    }),

  getRecentAlerts: protectedBase.query(async ({ ctx }) => {
    const rows = await getRecentIntelAlerts(getCtxUser(ctx).id, 15);
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      metadata: r.metadata as Record<string, unknown> | null,
    }));
  }),

  getIngestStatus: protectedBase.query(async () => {
    const run = await getLatestIngestRun();
    return {
      lastRun: run
        ? {
            id: run.id,
            status: run.status,
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt?.toISOString() ?? null,
            apiCounts: (run.apiCounts as Record<string, number>) ?? {},
            errors: (run.errors as string[]) ?? [],
          }
        : null,
      cacheTtlHours: ENV.trendingCacheTtlHours,
      serpApiDailyCap: ENV.serpApiDailyCap,
      metaAdsDailyCap: ENV.metaAdsDailyCap,
    };
  }),

  getAmazonCategories: featureProcedure("discover")
    .input(
      z.object({
        region: regionSchema.optional(),
        live: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      const configured = isRapidAmazonConfigured();
      const usage = configured ? await getRapidAmazonMonthlyUsage() : null;

      let categories = await getCachedAmazonCategories(region);
      let isLive = false;

      if ((!categories || categories.length === 0) && input.live && configured) {
        categories = await fetchAmazonProductCategoryList(region);
        isLive = categories.length > 0;
        if (isLive) {
          await syncAmazonCategoriesFromRapidApi([region]);
        }
      }

      return attachApiTruthLabels(
        {
          region,
          categories: categories ?? [],
          configured,
          usage,
          isLive,
        },
        {
          configured,
          hasData: Boolean(categories?.length),
          live: isLive,
        }
      );
    }),

  getPublicTrend: publicProcedure
    .input(
      z.object({
        keyword: z.string().min(1).max(120),
        region: regionSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertRateLimit(`public-trend:ip:${getClientIp(ctx.req)}`, 60, 60 * 1000);

      const keyword = requireKeyword(input.keyword);
      const region = (input.region ?? "US") as RegionCode;
      const [signal, ads, tiktok] = await Promise.all([
        getTrendSignal(keyword, region),
        getAdLibrarySnapshot(keyword, region),
        getTikTokAdsSnapshot(keyword, region),
      ]);
      return attachApiTruthLabels(
        {
          keyword,
          region,
          trend: signal,
          ads: ads
            ? {
                activeAdCount: ads.activeAdCount,
                advertiserCount: ads.advertiserCount,
                sampleCreatives: ads.creatives.slice(0, 3),
              }
            : null,
          tiktok: tiktok
            ? {
                activeAdCount: tiktok.activeAdCount,
                advertiserCount: tiktok.advertiserCount,
                source: tiktok.source,
                sampleCreatives: tiktok.creatives.slice(0, 3),
              }
            : null,
          updatedAt: signal?.fetchedAt ?? ads?.fetchedAt ?? tiktok?.fetchedAt ?? null,
        },
        {
          configured:
            isTrendIntelConfigured() || isMetaAdLibraryConfigured() || isTikTokAdsConfigured(),
          hasData: Boolean(signal || ads || tiktok),
          stale: Boolean(signal?.stale || ads?.stale || tiktok?.stale),
        }
      );
    }),
});
