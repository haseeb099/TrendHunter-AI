import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { getAiStatus } from "./aiHelpers";
import { getPlatformSettings } from "../planCatalog";
import { ENV } from "./env";
import { isMetaAdLibraryConfigured } from "../intelligence/adLibrary";
import { isSerpConfigured, isSerpApiConfigured } from "../search/serpapi";
import { isSerperConfigured, getSerperPoolStatus, serperPoolSummary } from "../search/serper";
import { getRapidAmazonMonthlyUsage, isRapidAmazonConfigured } from "../search/rapidAmazon";
import { getAllRapidApiUsage, isRapidApiConfigured } from "../search/rapidApi";
import { isJustSerpConfigured } from "../search/justserp";
import { isTikTokAdsConfigured, tikTokAdsProvider } from "../intelligence/tiktokAds";
import { isRedisConfigured } from "./redis";
import { runDeepHealthChecks } from "./healthChecks";
import { getAllProviderHealth } from "./providerHealth";
import { isGoogleOAuthConfigured } from "./oauth/google";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  deepHealth: publicProcedure.query(async () => {
    const result = await runDeepHealthChecks();
    return {
      ok: result.ok,
      checks: result.checks,
      timestamp: Date.now(),
    };
  }),

  getConfig: publicProcedure.query(async () => {
    const settings = await getPlatformSettings();
    return {
      ai: getAiStatus(),
      announcement: settings.announcement_banner
        ? {
            message: String(settings.announcement_banner),
            type: (settings.announcement_type as "info" | "warning" | "success") ?? "info",
          }
        : null,
      supportEmail: String(settings.support_email ?? "") || null,
      maintenanceMode: Boolean(settings.maintenance_mode),
      maintenanceMessage: String(settings.maintenance_message ?? "") || null,
      selfServeBilling: settings.self_serve_billing === true,
      registrationEnabled: settings.registration_enabled !== false,
      googleLoginEnabled: settings.google_login_enabled === true && isGoogleOAuthConfigured(),
      betaMode: ENV.betaMode,
      betaRequiresInvite: ENV.betaMode && Boolean(ENV.betaInviteCode),
      dataPlatform: {
        cacheFirst: ENV.ingestMode,
        trendingCacheTtlHours: ENV.trendingCacheTtlHours,
        serpApiConfigured: isSerpApiConfigured(),
        justSerpConfigured: isJustSerpConfigured(),
        serpConfigured: isSerpConfigured(),
        serperConfigured: isSerperConfigured(),
        serperPool: isSerperConfigured()
          ? serperPoolSummary(await getSerperPoolStatus())
          : null,
        rapidApiConfigured: isRapidApiConfigured(),
        rapidAmazonConfigured: isRapidAmazonConfigured(),
        rapidAmazonUsage: isRapidAmazonConfigured()
          ? await getRapidAmazonMonthlyUsage()
          : null,
        rapidApiUsage: isRapidApiConfigured() ? await getAllRapidApiUsage() : null,
        metaAdsConfigured: isMetaAdLibraryConfigured(),
        tiktokAdsConfigured: isTikTokAdsConfigured(),
        tiktokAdsProvider: tikTokAdsProvider(),
        redisConfigured: isRedisConfigured(),
        liveSearchRequiresCredits: ENV.liveSearchRequiresCredits,
        discoveryQueueMaxPerRun: ENV.discoveryQueueMaxPerRun,
        serpApiDailyCap: ENV.serpApiDailyCap,
        providerHealth: await getAllProviderHealth(),
      },
    };
  }),
});
