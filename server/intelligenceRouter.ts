import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "./_core/trpc";
import { featureProcedure, protectedBase } from "./_core/planMiddleware";

const intelProcedure = featureProcedure("discover");
import { getCtxUser } from "./_core/trpc";
import { assertRateLimit, getClientIp } from "./_core/rateLimit";
import { spendCredits } from "./credits";
import { getTrendSignal } from "./intelligence/trends";
import { isSerpConfigured } from "./search/serpapi";
import { getAdLibrarySnapshot, isMetaAdLibraryConfigured } from "./intelligence/adLibrary";
import {
  getTikTokAdsSnapshot,
  isTikTokAdsConfigured,
  listTikTokAdKeywords,
  tikTokAdsProvider,
} from "./intelligence/tiktokAds";
import { getProductIntelligence, buildIntelligenceContext } from "./intelligence/summary";
import { buildMarketDigest, listTrendingKeywords, listAdRadarKeywords } from "./intelligence/marketDigest";
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
import type { RegionCode } from "@shared/searchTypes";

const regionSchema = z.enum(["US", "UK", "EU", "GLOBAL"]);

function requireKeyword(raw: string): string {
  const keyword = sanitizeKeyword(raw);
  if (!keyword) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Keyword is required" });
  }
  return keyword;
}

export const intelligenceRouter = router({
  getTrendPulse: featureProcedure("discover")
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
        live: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const keyword = requireKeyword(input.keyword);
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      let creditsUsed = 0;

      const signal = await getTrendSignal(keyword, region, { live: input.live });
      if (input.live) {
        creditsUsed = await spendCredits(getCtxUser(ctx), "trends_live", { keyword });
      }
      return { signal, creditsUsed, region };
    }),

  getAdRadar: featureProcedure("discover")
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
      if (input.live) {
        creditsUsed = await spendCredits(getCtxUser(ctx), "ad_library_live", { keyword });
      }
      return {
        snapshot,
        creditsUsed,
        configured: isMetaAdLibraryConfigured(),
      };
    }),

  getTikTokRadar: featureProcedure("discover")
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
      if (input.live) {
        creditsUsed = await spendCredits(getCtxUser(ctx), "tiktok_ads_live", { keyword });
      }
      return {
        snapshot,
        creditsUsed,
        configured: isTikTokAdsConfigured(),
        provider: tikTokAdsProvider(),
      };
    }),

  listTikTokKeywords: intelProcedure
    .input(z.object({ region: regionSchema.optional() }))
    .query(({ input }) => listTikTokAdKeywords(input.region ?? ENV.defaultRegion)),

  getProductIntel: intelProcedure
    .input(
      z.object({
        keyword: z.string().min(1),
        region: regionSchema.optional(),
      })
    )
    .query(({ input }) => {
      const keyword = requireKeyword(input.keyword);
      const region = (input.region ?? ENV.defaultRegion) as RegionCode;
      return getProductIntelligence(keyword, region);
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
      return {
        context: buildIntelligenceContext(keyword, trend, ads),
        trend,
        ads,
      };
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
      const digest = await buildMarketDigest(region, input.category);
      const ingest = await getLatestIngestRun();
      return {
        region,
        ...digest,
        metaConfigured: isMetaAdLibraryConfigured(),
        serpConfigured: isSerpConfigured(),
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
      return {
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
      };
    }),
});
