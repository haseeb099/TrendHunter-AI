import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { getAiStatus } from "./aiHelpers";
import { getPlatformSettings } from "../planCatalog";
import { ENV } from "./env";
import { isMetaAdLibraryConfigured } from "../intelligence/adLibrary";
import { isTikTokAdsConfigured, tikTokAdsProvider } from "../intelligence/tiktokAds";
import { isRedisConfigured } from "./redis";

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
      dataPlatform: {
        cacheFirst: ENV.ingestMode,
        trendingCacheTtlHours: ENV.trendingCacheTtlHours,
        serpApiConfigured: Boolean(ENV.serpApiKey),
        metaAdsConfigured: isMetaAdLibraryConfigured(),
        tiktokAdsConfigured: isTikTokAdsConfigured(),
        tiktokAdsProvider: tikTokAdsProvider(),
        redisConfigured: isRedisConfigured(),
        liveSearchRequiresCredits: ENV.liveSearchRequiresCredits,
      },
    };
  }),
});
