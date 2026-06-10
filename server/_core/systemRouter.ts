import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { getAiStatus } from "./aiHelpers";
import { getPlatformSettings } from "../planCatalog";

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
    };
  }),
});
