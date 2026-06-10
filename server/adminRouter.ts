import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "./_core/trpc";
import { nanoid } from "nanoid";
import { hashPassword } from "./_core/password";
import {
  createUser,
  deleteUserCompletely,
  exportUsersForAdmin,
  getAdminAuditForUser,
  getAdminOverviewStats,
  getCouponRedemptionsList,
  getGlobalAuditLog,
  getPlatformAnalytics,
  getUserActivitySummary,
  getUserByEmail,
  getUserById,
  getUserCouponRedemptions,
  getUserSearchHistory,
  listUsersForAdmin,
  logAdminAction,
  updateUserAdmin,
} from "./db";
import { createTrialFields } from "./plans";
import { buildSubscriptionInfo } from "./plans";
import {
  getAllPlanConfigs,
  getPlatformSettings,
  invalidatePlanCache,
  updatePlanConfig,
  upsertPlatformSetting,
} from "./planCatalog";
import type { AccountStatus, CouponType, LimitOverrides } from "@shared/adminTypes";
import { ALL_FEATURE_IDS, type FeatureId, type PlanId } from "@shared/plans";
import { toAdminUserSummary } from "./_core/userPublic";
import { coupons } from "../drizzle/schema";
import { getDb } from "./db";
import { desc, eq } from "drizzle-orm";

const accountStatusSchema = z.enum(["active", "deactivated", "flagged", "paused"]);
const planIdSchema = z.enum(["trial", "starter", "pro", "business", "agency"]);

const limitOverridesSchema = z
  .object({
    searchesPerMonth: z.number().int().min(-1).optional(),
    aiCallsPerMonth: z.number().int().min(-1).optional(),
    liveCreditsPerMonth: z.number().int().min(-1).optional(),
    pipelineItems: z.number().int().min(-1).optional(),
    watchlistItems: z.number().int().min(-1).optional(),
  })
  .optional();

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function audit(
  adminId: number,
  targetId: number,
  action: string,
  details?: Record<string, unknown>
) {
  await logAdminAction(adminId, targetId, action, details);
}

export const adminRouter = router({
  getOverview: adminProcedure.query(() => getAdminOverviewStats()),

  listUsers: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        accountStatus: accountStatusSchema.optional(),
        planId: planIdSchema.optional(),
        role: z.enum(["user", "admin"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
    )
    .query(({ input }) => listUsersForAdmin(input)),

  exportUsers: adminProcedure.query(() => exportUsersForAdmin()),

  getPlatformAnalytics: adminProcedure.query(() => getPlatformAnalytics()),

  getActivityLog: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
      })
    )
    .query(({ input }) => getGlobalAuditLog(input.page, input.pageSize)),

  listCouponRedemptions: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(({ input }) => getCouponRedemptionsList(input.limit)),

  getUserDetail: adminProcedure
    .input(z.object({ userId: z.number().int() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const [subscription, searchHistory, auditLog, activity, couponHistory] =
        await Promise.all([
          buildSubscriptionInfo(user),
          getUserSearchHistory(input.userId, 40),
          getAdminAuditForUser(input.userId, 25),
          getUserActivitySummary(input.userId),
          getUserCouponRedemptions(input.userId),
        ]);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          planId: user.planId,
          planStatus: user.planStatus,
          accountStatus: user.accountStatus,
          flagReason: user.flagReason,
          adminNotes: user.adminNotes,
          limitOverrides: user.limitOverrides as LimitOverrides | null,
          pausedUntil: user.pausedUntil,
          trialStartedAt: user.trialStartedAt,
          trialEndsAt: user.trialEndsAt,
          planStartedAt: user.planStartedAt,
          planExpiresAt: user.planExpiresAt,
          hasUsedTrial: user.hasUsedTrial,
          lastSignedIn: user.lastSignedIn,
          createdAt: user.createdAt,
        },
        subscription,
        searchHistory,
        auditLog,
        activity,
        couponHistory,
      };
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        accountStatus: accountStatusSchema.optional(),
        flagReason: z.string().max(512).nullable().optional(),
        adminNotes: z.string().max(5000).nullable().optional(),
        planId: planIdSchema.optional(),
        planStatus: z.enum(["active", "expired", "cancelled"]).optional(),
        limitOverrides: limitOverridesSchema,
        clearLimitOverrides: z.boolean().optional(),
        extendTrialDays: z.number().int().min(1).max(365).optional(),
        extendPlanDays: z.number().int().min(1).max(365).optional(),
        pauseUntil: z.string().datetime().nullable().optional(),
        role: z.enum(["user", "admin"]).optional(),
        name: z.string().min(1).max(128).optional(),
        hasUsedTrial: z.boolean().optional(),
        resetTrialEligibility: z.boolean().optional(),
        expirePlanNow: z.boolean().optional(),
        grantFreshTrial: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (user.id === ctx.user.id && input.role === "user") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot demote yourself" });
      }
      if (user.id === ctx.user.id && input.accountStatus === "deactivated") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot deactivate yourself" });
      }

      const patch: Parameters<typeof updateUserAdmin>[1] = {};

      if (input.accountStatus !== undefined) {
        patch.accountStatus = input.accountStatus as AccountStatus;
        if (input.accountStatus === "paused" && !input.pauseUntil) {
          patch.pausedUntil = addDays(new Date(), 30);
        }
        if (input.accountStatus === "active") {
          patch.pausedUntil = null;
        }
      }
      if (input.flagReason !== undefined) patch.flagReason = input.flagReason;
      if (input.adminNotes !== undefined) patch.adminNotes = input.adminNotes;
      if (input.planId !== undefined) patch.planId = input.planId as PlanId;
      if (input.planStatus !== undefined) patch.planStatus = input.planStatus;
      if (input.role !== undefined) patch.role = input.role;
      if (input.name !== undefined) patch.name = input.name;

      if (input.resetTrialEligibility || input.hasUsedTrial === false) {
        patch.hasUsedTrial = false;
      } else if (input.hasUsedTrial === true) {
        patch.hasUsedTrial = true;
      }

      if (input.expirePlanNow) {
        patch.planStatus = "expired";
      }

      if (input.grantFreshTrial) {
        const trialFields = await createTrialFields(new Date());
        Object.assign(patch, trialFields);
      }

      if (input.clearLimitOverrides) {
        patch.limitOverrides = null;
      } else if (input.limitOverrides !== undefined) {
        patch.limitOverrides = input.limitOverrides;
      }

      if (input.pauseUntil !== undefined) {
        patch.pausedUntil = input.pauseUntil ? new Date(input.pauseUntil) : null;
      }

      if (input.extendTrialDays) {
        const base = user.trialEndsAt ? new Date(user.trialEndsAt) : new Date();
        patch.trialEndsAt = addDays(base, input.extendTrialDays);
        patch.planId = "trial";
        patch.planStatus = "active";
      }

      if (input.extendPlanDays) {
        const base = user.planExpiresAt ? new Date(user.planExpiresAt) : new Date();
        patch.planExpiresAt = addDays(base, input.extendPlanDays);
        patch.planStatus = "active";
      }

      await updateUserAdmin(input.userId, patch);
      await audit(ctx.user.id, input.userId, "update_user", {
        ...patch,
        extendTrialDays: input.extendTrialDays,
        extendPlanDays: input.extendPlanDays,
      });

      const updated = await getUserById(input.userId);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return {
        user: toAdminUserSummary(updated),
        subscription: await buildSubscriptionInfo(updated),
      };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete yourself" });
      }
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      await audit(ctx.user.id, input.userId, "delete_user", {
        email: user.email,
      });
      await deleteUserCompletely(input.userId);
      return { success: true };
    }),

  quickAction: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        action: z.enum([
          "activate",
          "deactivate",
          "flag",
          "unflag",
          "pause",
          "unpause",
        ]),
        flagReason: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && ["deactivate", "pause"].includes(input.action)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot perform this action on yourself" });
      }

      const statusMap: Record<string, AccountStatus> = {
        activate: "active",
        deactivate: "deactivated",
        flag: "flagged",
        unpause: "active",
        pause: "paused",
        unflag: "active",
      };

      const patch: Parameters<typeof updateUserAdmin>[1] = {
        accountStatus: statusMap[input.action],
      };

      if (input.action === "unflag" || input.action === "activate" || input.action === "unpause") {
        patch.flagReason = null;
        patch.pausedUntil = null;
      }
      if (input.action === "flag" && input.flagReason) {
        patch.flagReason = input.flagReason;
      }
      if (input.action === "pause") {
        patch.pausedUntil = addDays(new Date(), 30);
      }

      await updateUserAdmin(input.userId, patch);
      await audit(ctx.user.id, input.userId, input.action, patch);

      const updated = await getUserById(input.userId);
      return updated ? buildSubscriptionInfo(updated) : null;
    }),

  bulkQuickAction: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.number().int()).min(1).max(50),
        action: z.enum(["activate", "deactivate", "pause", "flag"]),
        flagReason: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const filtered = input.userIds.filter((id) => id !== ctx.user.id);
      const statusMap: Record<string, AccountStatus> = {
        activate: "active",
        deactivate: "deactivated",
        pause: "paused",
        flag: "flagged",
      };

      for (const userId of filtered) {
        const patch: Parameters<typeof updateUserAdmin>[1] = {
          accountStatus: statusMap[input.action],
        };
        if (input.action === "activate") {
          patch.flagReason = null;
          patch.pausedUntil = null;
        }
        if (input.action === "flag" && input.flagReason) {
          patch.flagReason = input.flagReason;
        }
        if (input.action === "pause") {
          patch.pausedUntil = addDays(new Date(), 30);
        }
        await updateUserAdmin(userId, patch);
        await audit(ctx.user.id, userId, `bulk_${input.action}`, patch);
      }

      return { updated: filtered.length };
    }),

  createUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).optional(),
        planId: planIdSchema.default("trial"),
        role: z.enum(["user", "admin"]).default("user"),
        startTrial: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const existing = await getUserByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      const now = new Date();
      const openId = nanoid();
      const trialFields =
        input.planId === "trial" && input.startTrial ? await createTrialFields(now) : {};

      const user = await createUser({
        openId,
        email,
        name: input.name ?? input.email.split("@")[0] ?? "User",
        passwordHash: hashPassword(input.password),
        loginMethod: "local",
        role: input.role,
        planId: input.planId,
        planStatus: "active",
        accountStatus: "active",
        lastSignedIn: now,
        planStartedAt: now,
        ...trialFields,
        ...(input.planId !== "trial" ? { hasUsedTrial: true } : {}),
      });

      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
      }

      await audit(ctx.user.id, user.id, "create_user", {
        email: input.email,
        planId: input.planId,
        role: input.role,
      });

      return {
        id: user.id,
        email: user.email,
        subscription: await buildSubscriptionInfo(user),
      };
    }),

  resetPassword: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      await updateUserAdmin(input.userId, { passwordHash: hashPassword(input.newPassword) });
      await audit(ctx.user.id, input.userId, "reset_password", {});
      return { success: true };
    }),

  listPlans: adminProcedure.query(async () => getAllPlanConfigs()),

  updatePlan: adminProcedure
    .input(
      z.object({
        planId: planIdSchema,
        name: z.string().min(1).max(128).optional(),
        tagline: z.string().max(512).optional(),
        priceMonthly: z.number().min(0).optional(),
        billingPeriod: z.string().max(64).optional(),
        highlight: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
        trialDays: z.number().int().min(1).max(90).optional(),
        features: z.array(z.string()).optional(),
        featureIds: z.array(z.string()).optional(),
        limits: z
          .object({
            searchesPerMonth: z.number().int().min(-1),
            pipelineItems: z.number().int().min(-1),
            watchlistItems: z.number().int().min(-1),
            aiCallsPerMonth: z.number().int().min(-1),
            liveCreditsPerMonth: z.number().int().min(-1),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { planId, ...data } = input;
      if (data.featureIds) {
        const invalid = data.featureIds.filter(
          (id) => !ALL_FEATURE_IDS.includes(id as FeatureId)
        );
        if (invalid.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid feature IDs: ${invalid.join(", ")}`,
          });
        }
      }
      await updatePlanConfig(planId as PlanId, {
        ...data,
        featureIds: data.featureIds as FeatureId[] | undefined,
      });
      if (input.trialDays !== undefined) {
        await upsertPlatformSetting("trial_days", input.trialDays);
      }
      await audit(ctx.user.id, ctx.user.id, "update_plan", { planId, ...data });
      invalidatePlanCache();
      return getAllPlanConfigs();
    }),

  listCoupons: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      couponType: c.couponType as CouponType,
      value: c.value,
      grantPlanId: c.grantPlanId as PlanId | null,
      maxRedemptions: c.maxRedemptions,
      redemptionCount: c.redemptionCount,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }),

  createCoupon: adminProcedure
    .input(
      z.object({
        code: z.string().min(3).max(32),
        description: z.string().max(512).optional(),
        couponType: z.enum([
          "grant_plan",
          "extend_trial",
          "extend_subscription",
          "bonus_searches",
          "discount_percent",
        ]),
        value: z.number().positive(),
        grantPlanId: planIdSchema.optional(),
        maxRedemptions: z.number().int().min(-1).default(-1),
        expiresAt: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (input.couponType === "grant_plan" && !input.grantPlanId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "grantPlanId required for grant_plan coupons." });
      }

      const code = input.code.trim().toUpperCase();
      const existing = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Coupon code already exists." });
      }

      await db.insert(coupons).values({
        code,
        description: input.description ?? null,
        couponType: input.couponType,
        value: input.value,
        grantPlanId: input.grantPlanId ?? null,
        maxRedemptions: input.maxRedemptions,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdByUserId: ctx.user.id,
      });

      await audit(ctx.user.id, ctx.user.id, "create_coupon", { code, couponType: input.couponType });
      return { code };
    }),

  updateCoupon: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        description: z.string().max(512).nullable().optional(),
        isActive: z.boolean().optional(),
        maxRedemptions: z.number().int().min(-1).optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const patch: Record<string, unknown> = {};
      if (input.description !== undefined) patch.description = input.description;
      if (input.isActive !== undefined) patch.isActive = input.isActive;
      if (input.maxRedemptions !== undefined) patch.maxRedemptions = input.maxRedemptions;
      if (input.expiresAt !== undefined) {
        patch.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      }

      await db.update(coupons).set(patch).where(eq(coupons.id, input.id));
      await audit(ctx.user.id, ctx.user.id, "update_coupon", { id: input.id, ...patch });
      return { success: true };
    }),

  deleteCoupon: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.delete(coupons).where(eq(coupons.id, input.id));
      await audit(ctx.user.id, ctx.user.id, "delete_coupon", { id: input.id });
      return { success: true };
    }),

  getSettings: adminProcedure.query(async () => {
    const raw = await getPlatformSettings();
    return {
      trial_days: Number(raw.trial_days ?? 3),
      registration_enabled: raw.registration_enabled !== false,
      maintenance_mode: Boolean(raw.maintenance_mode),
      maintenance_message: String(raw.maintenance_message ?? ""),
      announcement_banner: String(raw.announcement_banner ?? ""),
      announcement_type: (raw.announcement_type as "info" | "warning" | "success") ?? "info",
      support_email: String(raw.support_email ?? ""),
      ai_features_enabled: raw.ai_features_enabled !== false,
      self_serve_billing: raw.self_serve_billing === true,
    };
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        trial_days: z.number().int().min(1).max(90).optional(),
        registration_enabled: z.boolean().optional(),
        maintenance_mode: z.boolean().optional(),
        maintenance_message: z.string().max(500).optional(),
        announcement_banner: z.string().max(500).optional(),
        announcement_type: z.enum(["info", "warning", "success"]).optional(),
        support_email: z.string().email().or(z.literal("")).optional(),
        ai_features_enabled: z.boolean().optional(),
        self_serve_billing: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entries = Object.entries(input).filter(([, v]) => v !== undefined);
      for (const [key, value] of entries) {
        await upsertPlatformSetting(key, value);
      }
      await audit(ctx.user.id, ctx.user.id, "update_settings", input);
      invalidatePlanCache();
      const raw = await getPlatformSettings();
      return {
        trial_days: Number(raw.trial_days ?? 3),
        registration_enabled: raw.registration_enabled !== false,
        maintenance_mode: Boolean(raw.maintenance_mode),
        maintenance_message: String(raw.maintenance_message ?? ""),
        announcement_banner: String(raw.announcement_banner ?? ""),
        announcement_type: (raw.announcement_type as "info" | "warning" | "success") ?? "info",
        support_email: String(raw.support_email ?? ""),
        ai_features_enabled: raw.ai_features_enabled !== false,
        self_serve_billing: raw.self_serve_billing === true,
      };
    }),
});
