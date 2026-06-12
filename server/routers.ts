import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  authenticatedProcedure,
  publicProcedure,
  router,
  getCtxUser,
} from "./_core/trpc";
import {
  aiProcedure,
  featureProcedure,
  pipelineCreateProcedure,
  protectedBase,
  searchProcedure,
  watchlistAddProcedure,
} from "./_core/planMiddleware";
import { billingRouter } from "./billingRouter";
import { adminRouter } from "./adminRouter";
import { assertSearchQuota, buildSubscriptionInfo, createTrialFields } from "./plans";
import { assertLiveSearchHourlyLimit } from "./_core/rateLimit";
import { spendCredits } from "./credits";
import { getTrendSignal } from "./intelligence/trends";
import { getAdLibrarySnapshot } from "./intelligence/adLibrary";
import { buildIntelligenceContext, gapItemConfidence, intelCoverageLevel } from "./intelligence/summary";
import { resolveEffectivePlan } from "./plans";
import {
  canSaveMoreKits,
  formatSavedKitLimit,
  savedSocialKitLimit,
} from "@shared/socialKit";
import type { SocialKitPayload } from "@shared/socialKitTypes";
import { intelligenceRouter } from "./intelligenceRouter";
import { withAiOutputCache } from "./dataPlatform/aiOutputCache";
import { creditsRouter } from "./creditsRouter";
import { getPlatformSettings } from "./planCatalog";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./_core/password";
import { createSessionToken, setSessionCookie } from "./_core/session";
import { normalizeEmail } from "./_core/normalizeEmail";
import { assertAuthRateLimit, assertRateLimit, getClientIp } from "./_core/rateLimit";
import { assertUserOwnsUploadKey, buildUserUploadKey } from "./_core/uploadKeys";
import { toPublicUser } from "./_core/userPublic";
import {
  getSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getPipelineItems,
  createPipelineItem,
  updatePipelineItem,
  deletePipelineItem,
  getChatSessions,
  createChatSession,
  deleteChatSession,
  getChatMessages,
  addChatMessage,
  chatSessionBelongsToUser,
  getChatSession,
  updateChatSessionTitle,
  getProfitCalculations,
  saveProfitCalculation,
  deleteProfitCalculation,
  getSuppliers,
  getSupplierCatalog,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getUserByEmail,
  createUser,
  updateUserProfile,
  getFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
  countUserEvents,
  recordUserEvent,
  logZeroResultSearch,
  getSavedSocialKits,
  getSavedSocialKitById,
  countSavedSocialKits,
  saveSocialKit,
  updateSocialKit,
  deleteSocialKit,
  createPasswordResetToken,
  getValidPasswordResetToken,
  markPasswordResetTokenUsed,
  invalidatePasswordResetTokensForUser,
  assertDatabaseAvailable,
} from "./db";
import { buildPasswordResetEmail, sendEmail } from "./notifications/email";
import { invokeLLMOrThrow } from "./_core/aiHelpers";
import { getSearchProviderStatus, getMarketplaceCoverage, searchProducts as runProductSearch } from "./search";
import { paginateResults } from "./search/pagination";
import { getCategoryTree } from "./search/categoryTaxonomy";
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  REGION_LABELS,
  SHIP_FROM_OPTIONS,
  SORT_OPTIONS,
  type ProductHuntFilters,
  type RegionCode,
} from "@shared/searchTypes";
import { ENV } from "./_core/env";
import { createLogger } from "./_core/logger";
import { getSupportedRegionOptions } from "./search/regions";
import { getTrendingFeed } from "./trending";
import { computeSupplierConfidenceTier, getOffersForProduct, getOffersStatus } from "./suppliers";
import { attachOffersTruthLabels, attachSearchResponseTruthLabels } from "./search/truthLabels";
import { getProductSnapshotDiff } from "./dataPlatform/snapshotDiff";
import { computeNextMoves } from "./ranking/nextMoves";
import { getStorageStatus, storageGet, storagePut } from "./storage";

const authLog = createLogger("auth");
const searchLog = createLogger("search");

const regionCodeSchema = z.enum(["US", "UK", "EU", "GLOBAL"]);
const shipFromSchema = z.enum(["US", "UK", "CN", "EU"]);
const sortSchema = z.enum(["price_asc", "price_desc", "trend_score", "rating"]);

const productHuntFiltersSchema = z
  .object({
    priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
    region: regionCodeSchema.optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    productType: z.string().optional(),
    query: z.string().max(200).optional(),
    shipFrom: z.array(shipFromSchema).optional(),
    sort: sortSchema.optional(),
    minRating: z.number().optional(),
    maxShippingDays: z.number().optional(),
  })
  .optional();

const searchPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(500).optional(),
    cursor: z.number().int().min(0).optional(),
  })
  .optional();

async function runSocialAiCached<T extends Record<string, unknown>>(
  feature: string,
  cacheInput: Record<string, unknown>,
  live: boolean | undefined,
  run: () => Promise<T>
): Promise<T> {
  if (live) return run();
  return withAiOutputCache(feature, cacheInput, run);
}

export const appRouter = router({
  system: systemRouter,
  billing: billingRouter,
  admin: adminRouter,
  credits: creditsRouter,
  intelligence: intelligenceRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      const subscription = await buildSubscriptionInfo(opts.ctx.user);
      return { ...toPublicUser(opts.ctx.user), subscription };
    }),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8, "Password must be at least 8 characters"),
          name: z.string().min(1).optional(),
          acceptedTerms: z.literal(true, {
            message: "You must accept the Terms of Service",
          }),
          acceptedPrivacy: z.literal(true, {
            message: "You must accept the Privacy Policy",
          }),
          inviteCode: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          await assertDatabaseAvailable();
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err instanceof Error ? err.message : "Database unavailable",
          });
        }
        await assertAuthRateLimit(ctx.req, input.email);
        const settings = await getPlatformSettings();
        if (settings.registration_enabled === false) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "New registrations are temporarily closed.",
          });
        }

        if (ENV.betaMode && ENV.betaInviteCode) {
          if (input.inviteCode?.trim() !== ENV.betaInviteCode) {
            authLog.warn("register_invalid_invite", { email: input.email });
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Invalid or missing beta invite code.",
            });
          }
        }

        const email = normalizeEmail(input.email);
        const existing = await getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
        }

        const openId = nanoid();
        const now = new Date();
        const user = await createUser({
          openId,
          email,
          name: input.name ?? input.email.split("@")[0] ?? "User",
          passwordHash: hashPassword(input.password),
          loginMethod: "local",
          role: "user",
          lastSignedIn: now,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          ...(await createTrialFields(now)),
        });

        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
        }

        const token = await createSessionToken(user.openId, user.name ?? "");
        setSessionCookie(ctx.req, ctx.res, token);
        authLog.info("register_success", { userId: user.id, email });
        return toPublicUser(user);
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          await assertDatabaseAvailable();
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err instanceof Error ? err.message : "Database unavailable",
          });
        }
        await assertAuthRateLimit(ctx.req, input.email);
        const user = await getUserByEmail(normalizeEmail(input.email));
        if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        if (user.accountStatus === "deactivated") {
          authLog.warn("login_deactivated", { userId: user.id });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This account has been deactivated. Contact support.",
          });
        }

        const token = await createSessionToken(user.openId, user.name ?? "");
        setSessionCookie(ctx.req, ctx.res, token);
        authLog.info("login_success", { userId: user.id });
        return toPublicUser(user);
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      authLog.info("logout", { userId: ctx.user?.id });
      return { success: true } as const;
    }),

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        const ip = getClientIp(ctx.req);
        await assertRateLimit(`forgot-password:ip:${ip}`, 5, 15 * 60 * 1000);
        await assertRateLimit(`forgot-password:email:${email}`, 3, 60 * 60 * 1000);

        const user = await getUserByEmail(email);
        if (user?.passwordHash && user.loginMethod === "local") {
          const rawToken = randomBytes(32).toString("hex");
          const tokenHash = createHash("sha256").update(rawToken).digest("hex");
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

          await invalidatePasswordResetTokensForUser(user.id);
          await createPasswordResetToken({
            userId: user.id,
            tokenHash,
            expiresAt,
          });

          const resetUrl = `${ENV.appUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
          const { subject, html, text } = buildPasswordResetEmail(resetUrl);
          await sendEmail({ to: email, subject, html, text });
          authLog.info("password_reset_requested", { userId: user.id });

          if (ENV.passwordResetTestMode) {
            return { success: true as const, testResetToken: rawToken };
          }
        }

        return { success: true as const };
      }),

    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(32),
          newPassword: z.string().min(8, "Password must be at least 8 characters"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ip = getClientIp(ctx.req);
        await assertRateLimit(`reset-password:ip:${ip}`, 10, 15 * 60 * 1000);

        const tokenHash = createHash("sha256").update(input.token).digest("hex");
        const row = await getValidPasswordResetToken(tokenHash);
        if (!row) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset link. Request a new password reset.",
          });
        }

        await updateUserProfile(row.userId, { passwordHash: hashPassword(input.newPassword) });
        await markPasswordResetTokenUsed(row.id);
        await invalidatePasswordResetTokensForUser(row.userId);
        authLog.info("password_reset_complete", { userId: row.userId });

        return { success: true as const };
      }),

    updateProfile: authenticatedProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, { name: input.name.trim() });
        const fresh = await getUserByEmail(ctx.user.email ?? "");
        if (!fresh) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        const subscription = await buildSubscriptionInfo(fresh);
        return { ...toPublicUser(fresh), subscription };
      }),

    changePassword: authenticatedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8, "Password must be at least 8 characters"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(ctx.user.email ?? "");
        if (!user?.passwordHash || !verifyPassword(input.currentPassword, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        await updateUserProfile(ctx.user.id, { passwordHash: hashPassword(input.newPassword) });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true as const, requireReLogin: true as const };
      }),
  }),

  // Search & Discovery
  search: router({
    getSavedSearches: protectedBase.query(({ ctx }) => getSavedSearches(getCtxUser(ctx).id)),
    saveSearch: protectedBase
      .input(z.object({ query: z.string(), filters: z.unknown().optional() }))
      .mutation(({ ctx, input }) => createSavedSearch(getCtxUser(ctx).id, input.query, input.filters)),
    deleteSavedSearch: protectedBase
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteSavedSearch(input.id, getCtxUser(ctx).id)),
    getProviderStatus: protectedBase.query(async () => getSearchProviderStatus()),
    getMarketplaceCoverage: protectedBase.query(async () => getMarketplaceCoverage()),
    getFilterOptions: protectedBase.query(() => ({
      regions: getSupportedRegionOptions(),
      categories: PRODUCT_CATEGORIES.map((c) => ({
        value: c,
        label: CATEGORY_LABELS[c],
      })),
      shipFromOptions: SHIP_FROM_OPTIONS,
      sortOptions: SORT_OPTIONS,
      defaultRegion: ENV.defaultRegion,
      supportedRegions: ENV.supportedRegions,
      regionLabels: REGION_LABELS,
    })),
    getFilterPresets: protectedBase.query(({ ctx }) => getFilterPresets(getCtxUser(ctx).id)),
    saveFilterPreset: featureProcedure("filter_presets")
      .input(z.object({ name: z.string().min(1), filters: productHuntFiltersSchema }))
      .mutation(({ ctx, input }) =>
        saveFilterPreset(getCtxUser(ctx).id, input.name, (input.filters ?? {}) as ProductHuntFilters)
      ),
    deleteFilterPreset: protectedBase
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteFilterPreset(input.id, getCtxUser(ctx).id)),
    getCategoryTree: publicProcedure
      .input(z.object({ region: regionCodeSchema.optional() }).optional())
      .query(async ({ input }) => ({
        tree: await getCategoryTree(input?.region as RegionCode | undefined),
      })),
    searchProducts: searchProcedure()
      .input(
        z.object({
          query: z.string().min(1),
          platform: z.enum(["all", "ebay", "amazon", "shopify", "tiktok", "aliexpress", "cj"]),
          filters: productHuntFiltersSchema,
          live: z.boolean().optional(),
          pagination: searchPaginationSchema,
        })
      )
      .query(async ({ ctx, input }) => {
        const user = getCtxUser(ctx);
        let creditsUsed = 0;

        if (input.live) {
          await assertSearchQuota(user);
          await assertLiveSearchHourlyLimit(user);
        }

        const results = await runProductSearch(
          input.query,
          input.platform,
          input.filters as ProductHuntFilters | undefined,
          { live: input.live, pagination: input.pagination }
        );

        searchLog.info("Product search completed", {
          userId: user.id,
          query: input.query,
          platform: input.platform,
          live: Boolean(input.live),
          resultCount: results.results.length,
          isDemo: results.isDemo,
        });

        if (input.live) {
          creditsUsed = await spendCredits(user, "live_search", {
            query: input.query,
            platform: input.platform,
          });
          await recordUserEvent(user.id, "search_query", {
            query: input.query,
            platform: input.platform,
            live: true,
            creditsUsed,
          });
        }

        if (results.results.length === 0) {
          await logZeroResultSearch(user.id, {
            query: input.query,
            platform: input.platform,
            region: input.filters?.region,
            live: Boolean(input.live),
            tab: "search",
          });
        }

        return attachSearchResponseTruthLabels({
          ...results,
          creditsUsed: results.creditsUsed ?? creditsUsed,
        });
      }),
  }),

  trending: router({
    getFeed: publicProcedure
      .input(
        z.object({
          region: regionCodeSchema.optional(),
          category: z.string().optional(),
          filters: productHuntFiltersSchema,
          pagination: searchPaginationSchema,
          timeframe: z.enum(["7d", "30d", "90d"]).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const ip = getClientIp(ctx.req);
        await assertRateLimit(`trending:ip:${ip}`, 120, 60 * 1000);
        return getTrendingFeed({
          region: input.region as RegionCode | undefined,
          category: input.category,
          filters: input.filters as ProductHuntFilters | undefined,
          pagination: input.pagination,
          timeframe: input.timeframe,
        });
      }),
    getRegions: publicProcedure.query(() => ({
      defaultRegion: ENV.defaultRegion,
      regions: getSupportedRegionOptions(),
    })),
    getCategories: publicProcedure
      .input(z.object({ region: regionCodeSchema.optional() }))
      .query(() => ({
        categories: PRODUCT_CATEGORIES.map((c) => ({
          value: c,
          label: CATEGORY_LABELS[c],
        })),
      })),
  }),

  upload: router({
    getStatus: protectedBase.query(() => getStorageStatus()),
    getUrl: protectedBase
      .input(z.object({ key: z.string().min(1) }))
      .query(({ ctx, input }) => {
        assertUserOwnsUploadKey(getCtxUser(ctx).id, input.key);
        return storageGet(input.key);
      }),
    uploadFile: protectedBase
      .input(
        z.object({
          filename: z.string().min(1).max(255),
          contentType: z.string().min(1).max(128),
          dataBase64: z.string().max(8_000_000),
          folder: z.string().max(64).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const safeName =
          input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "") || "file";
        const folder = (input.folder ?? "uploads").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "uploads";
        const buffer = Buffer.from(input.dataBase64, "base64");
        if (buffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File exceeds 5 MB limit" });
        }
        const key = buildUserUploadKey(getCtxUser(ctx).id, folder, safeName);
        return storagePut(key, buffer, input.contentType);
      }),
  }),

  // Watchlist
  watchlist: router({
    getWatchlist: protectedBase.query(({ ctx }) => getWatchlist(getCtxUser(ctx).id)),
    addToWatchlist: watchlistAddProcedure()
      .input(
        z.object({
          productId: z.string(),
          productTitle: z.string(),
          productImage: z.string().optional(),
          platform: z.string(),
          price: z.number().optional(),
          sourceUrl: z.string().optional(),
          region: z.string().optional(),
          supplierPlatform: z.string().optional(),
          landedCost: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => addToWatchlist({ userId: getCtxUser(ctx).id, ...input })),
    removeFromWatchlist: protectedBase
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => removeFromWatchlist(input.id, getCtxUser(ctx).id)),
  }),

  // Product Validation (AI-powered)
  validate: router({
    validateProduct: aiProcedure("validate")
      .input(
        z.object({
          productTitle: z.string(),
          platform: z.string(),
          price: z.number(),
          region: regionCodeSchema.optional(),
          live: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = getCtxUser(ctx);
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        let creditsUsed = 0;

        const [trend, ads] = await Promise.all([
          getTrendSignal(input.productTitle, region, { live: input.live }),
          getAdLibrarySnapshot(input.productTitle, region, { live: false }),
        ]);
        const intelContext = buildIntelligenceContext(input.productTitle, trend, ads);

        const prompt = `Analyze this product for dropshipping viability:
Product: ${input.productTitle}
Platform: ${input.platform}
Price: $${input.price}

Market intelligence (cached daily data):
${intelContext}

Provide a JSON response with:
- trendScore (0-100): Is demand rising?
- saturationScore (0-100): How saturated is this niche?
- profitPotential (0-100): Margin potential?
- supplierReliability (0-100): Typical supplier quality?
- overallScore (0-100): Overall viability

Include dimensionReasoning with a brief explanation for each score field (trendScore, saturationScore, profitPotential, supplierReliability, overallScore).
Also include reasoning as a one-sentence overall summary.`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "product_validation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  trendScore: { type: "number" },
                  saturationScore: { type: "number" },
                  profitPotential: { type: "number" },
                  supplierReliability: { type: "number" },
                  overallScore: { type: "number" },
                  reasoning: { type: "string" },
                  dimensionReasoning: {
                    type: "object",
                    properties: {
                      trendScore: { type: "string" },
                      saturationScore: { type: "string" },
                      profitPotential: { type: "string" },
                      supplierReliability: { type: "string" },
                      overallScore: { type: "string" },
                    },
                    required: [
                      "trendScore",
                      "saturationScore",
                      "profitPotential",
                      "supplierReliability",
                      "overallScore",
                    ],
                    additionalProperties: false,
                  },
                },
                required: [
                  "trendScore",
                  "saturationScore",
                  "profitPotential",
                  "supplierReliability",
                  "overallScore",
                  "reasoning",
                  "dimensionReasoning",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        if (input.live) {
          creditsUsed = await spendCredits(user, "validate_live", {
            productTitle: input.productTitle,
          });
        }
        await recordUserEvent(user.id, "ai_call", { feature: "validate" });
        const parsed = JSON.parse(content);
        return { ...parsed, creditsUsed, trendSignal: trend, adSnapshot: ads };
      }),
  }),

  // Competitor Spy
  competitor: router({
    analyzeCompetitor: aiProcedure("competitors")
      .input(
        z.object({
          url: z.string().optional(),
          keyword: z.string().optional(),
          region: regionCodeSchema.optional(),
          live: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = getCtxUser(ctx);
        const keyword = input.keyword?.trim() ?? "";
        const url = input.url?.trim() ?? "";
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        let creditsUsed = 0;

        let marketplaceContext = "";
        if (keyword) {
          try {
            const searchResult = await runProductSearch(
              keyword,
              "all",
              { sort: "price_asc", region },
              { live: input.live }
            );
            if (input.live) {
              await recordUserEvent(user.id, "search_query", {
                query: keyword,
                platform: "all",
                source: "competitors",
                live: true,
              });
            }
            const top = searchResult.results.slice(0, 6);
            if (top.length > 0) {
              marketplaceContext = `\n\nMarketplace snapshot (${searchResult.dataMode ?? "cached"} data):\n${top
                .map(
                  (p) =>
                    `- [${p.platform}] ${p.title} @ ${p.price} ${p.currency ?? "USD"}${p.rating ? ` rating ${p.rating}` : ""}`
                )
                .join("\n")}`;
            }
          } catch {
            /* search enrichment is best-effort */
          }
        }

        const [trend, ads] = keyword
          ? await Promise.all([
              getTrendSignal(keyword, region, { live: input.live }),
              getAdLibrarySnapshot(keyword, region, { live: input.live }),
            ])
          : [null, null];

        const intelContext = keyword
          ? buildIntelligenceContext(keyword, trend, ads)
          : "";

        const prompt = `Analyze this competitor listing/store:
${url ? `URL: ${url}` : "URL: not provided"}
${keyword ? `Keyword focus: ${keyword}` : ""}${marketplaceContext}
${intelContext ? `\n\nTrend & ad intelligence:\n${intelContext}` : ""}

Provide competitive intelligence in JSON format:
- pricing: estimated price range
- reviewSentiment: positive/neutral/negative
- salesVelocity: estimated monthly sales (low/medium/high)
- adSpend: estimated monthly ad spend (use "unknown" if not detectable)
- topProducts: list of top 3 products
- gaps: identified market gaps
- threats: competitive threats (array of strings, use empty array if none)
- position: overall market position summary`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "competitor_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  pricing: { type: "string" },
                  reviewSentiment: { type: "string" },
                  salesVelocity: { type: "string" },
                  adSpend: { type: "string" },
                  topProducts: { type: "array", items: { type: "string" } },
                  gaps: { type: "array", items: { type: "string" } },
                  threats: { type: "array", items: { type: "string" } },
                  position: { type: "string" },
                },
                required: [
                  "pricing",
                  "reviewSentiment",
                  "salesVelocity",
                  "adSpend",
                  "topProducts",
                  "gaps",
                  "threats",
                  "position",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        const parsed =
          content && typeof content === "string" ? JSON.parse(content) : { position: "Analysis complete" };

        if (input.live && keyword) {
          creditsUsed = await spendCredits(user, "competitor_live", { keyword });
        }
        await recordUserEvent(user.id, "ai_call", { feature: "competitors" });
        return {
          analysis: parsed,
          timestamp: new Date(),
          creditsUsed,
          trendSignal: trend,
          adSnapshot: ads,
        };
      }),
  }),

  // Profit Calculator
  profit: router({
    getProfitCalculations: protectedBase.query(({ ctx }) => getProfitCalculations(getCtxUser(ctx).id)),
    calculateProfit: protectedBase
      .input(
        z.object({
          productTitle: z.string(),
          productCost: z.number(),
          shippingCost: z.number(),
          platformFee: z.number(),
          adSpend: z.number(),
          vatDuties: z.number(),
          sellingPrice: z.number(),
          platform: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const netProfit = input.sellingPrice - (input.productCost + input.shippingCost + input.platformFee + input.adSpend + input.vatDuties);
        const roi = (netProfit / input.productCost) * 100;
        const breakEvenAdSpend = input.sellingPrice - (input.productCost + input.shippingCost + input.platformFee + input.vatDuties);

        const calc = {
          userId: getCtxUser(ctx).id,
          ...input,
          netProfit,
          roi,
          breakEvenAdSpend,
        };

        await saveProfitCalculation(calc);
        return calc;
      }),
    deleteProfitCalculation: protectedBase
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteProfitCalculation(input.id, getCtxUser(ctx).id)),
  }),

  // Supplier Vetting
  supplier: router({
    getSuppliers: protectedBase.query(({ ctx }) => getSuppliers(getCtxUser(ctx).id)),
    createSupplier: protectedBase
      .input(
        z.object({
          name: z.string(),
          country: z.string().optional(),
          platform: z.string().optional(),
          shippingDaysMin: z.number().optional(),
          shippingDaysMax: z.number().optional(),
          moq: z.number().optional(),
          reliabilityScore: z.number().optional(),
          communicationScore: z.number().optional(),
          qualityScore: z.number().optional(),
          profileUrl: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => createSupplier({ userId: getCtxUser(ctx).id, ...input })),
    updateSupplier: protectedBase
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            name: z.string().optional(),
            country: z.string().optional(),
            platform: z.string().optional(),
            shippingDaysMin: z.number().optional(),
            shippingDaysMax: z.number().optional(),
            moq: z.number().optional(),
            reliabilityScore: z.number().optional(),
            communicationScore: z.number().optional(),
            qualityScore: z.number().optional(),
            profileUrl: z.string().optional(),
            notes: z.string().optional(),
            sampleOrdered: z.boolean().optional(),
            sampleStatus: z.string().optional(),
            sampleOrderDate: z.date().optional(),
          }),
        })
      )
      .mutation(({ ctx, input }) => updateSupplier(input.id, getCtxUser(ctx).id, input.data)),
    deleteSupplier: protectedBase
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteSupplier(input.id, getCtxUser(ctx).id)),
    vetSupplier: protectedBase
      .input(z.object({ supplierId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await updateSupplier(input.supplierId, getCtxUser(ctx).id, {
          sampleOrdered: true,
          sampleStatus: "ordered",
          sampleOrderDate: new Date(),
        });
        return { status: "sample_ordered", estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      }),
    getOffersForProduct: featureProcedure("supplier_offers")
      .input(
        z.object({
          productId: z.string().optional(),
          title: z.string().min(1),
          region: regionCodeSchema.optional(),
          category: z.string().optional(),
          targetPrice: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const status = getOffersStatus();
        const configured = status.cj.configured || status.aliexpress.configured;
        const response = await getOffersForProduct({
          productId: input.productId,
          title: input.title,
          region: input.region as RegionCode | undefined,
          category: input.category,
          targetPrice: input.targetPrice,
        });
        return attachOffersTruthLabels(response, configured);
      }),
    getCatalog: protectedBase
      .input(z.object({ category: z.string().optional() }))
      .query(({ input }) => getSupplierCatalog(input.category)),
    getOffersStatus: protectedBase.query(() => getOffersStatus()),
  }),

  product: router({
    getOffers: featureProcedure("supplier_offers")
      .input(
        z.object({
          productId: z.string().optional(),
          title: z.string().min(1),
          region: regionCodeSchema.optional(),
          category: z.string().optional(),
          targetPrice: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const status = getOffersStatus();
        const configured = status.cj.configured || status.aliexpress.configured;
        const response = await getOffersForProduct({
          productId: input.productId,
          title: input.title,
          region: input.region as RegionCode | undefined,
          category: input.category,
          targetPrice: input.targetPrice,
        });
        return {
          ...attachOffersTruthLabels(response, configured),
          confidenceTier: computeSupplierConfidenceTier(response.offers),
        };
      }),
    getDelta: protectedBase
      .input(
        z.object({
          canonicalProductId: z.string(),
          region: regionCodeSchema,
        })
      )
      .query(async ({ input }) => {
        const diff = await getProductSnapshotDiff(
          input.canonicalProductId,
          input.region as RegionCode
        );
        if (!diff) return null;
        return diff;
      }),
    getNextMoves: protectedBase
      .input(z.object({ productId: z.string(), title: z.string() }))
      .query(({ input }) => ({
        moves: computeNextMoves({
          id: input.productId,
          title: input.title,
          price: 0,
          platform: "unknown",
          image: null,
          shippingDays: null,
          supplier: null,
          rating: null,
          sourceUrl: null,
        }),
      })),
  }),

  // Social Media Kit
  social: router({
    generateHashtags: aiProcedure("social")
      .input(
        z.object({
          productTitle: z.string(),
          niche: z.string().optional(),
          region: regionCodeSchema.optional(),
          live: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = getCtxUser(ctx);
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        const cacheInput = {
          productTitle: input.productTitle,
          niche: input.niche ?? "",
          region,
        };

        return runSocialAiCached("social_hashtags", cacheInput, input.live, async () => {
        const kw = input.niche?.trim() || input.productTitle;
        let creditsUsed = 0;
        const [trend, ads] = await Promise.all([
          getTrendSignal(kw, region, { live: input.live }),
          getAdLibrarySnapshot(kw, region),
        ]);
        if (input.live) {
          creditsUsed = await spendCredits(user, "social_live", { productTitle: input.productTitle });
        }
        const rising = trend?.risingQueries?.slice(0, 8).join(", ") ?? "";
        const adHooks = ads?.creatives?.slice(0, 3).map((c) => c.bodyText).filter(Boolean).join(" | ") ?? "";

        const prompt = `Generate 30 trending hashtags for this product on TikTok and Instagram:
Product: ${input.productTitle}
${input.niche ? `Niche: ${input.niche}` : ""}
${rising ? `Rising search queries: ${rising}` : ""}
${adHooks ? `Competitor ad hooks to differentiate from: ${adHooks}` : ""}

Group mentally into: trending (10), niche (10), brand-style (10).
Return as a JSON array of hashtag strings (without the # symbol).`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "hashtags",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["hashtags"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        await recordUserEvent(user.id, "ai_call", { feature: "social" });
        const parsed = JSON.parse(content);
        return { ...parsed, creditsUsed, trendSignal: trend };
        });
      }),
    generateAdCopy: aiProcedure("social")
      .input(
        z.object({
          productTitle: z.string(),
          productBenefit: z.string(),
          region: regionCodeSchema.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        return withAiOutputCache(
          "social_ad_copy",
          {
            productTitle: input.productTitle,
            productBenefit: input.productBenefit,
            region,
          },
          async () => {
        const ads = await getAdLibrarySnapshot(input.productTitle, region);
        const competitorHooks =
          ads?.creatives?.slice(0, 5).map((c) => c.bodyText).filter(Boolean).join("\n- ") ?? "";

        const prompt = `Write 5 compelling ad copy variations for this product:
Product: ${input.productTitle}
Key Benefit: ${input.productBenefit}
${competitorHooks ? `Competitor hooks to beat:\n- ${competitorHooks}` : ""}

Return as JSON with array of copy strings. Each should be 50-100 characters, attention-grabbing, and include a CTA.`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ad_copy",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  copies: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["copies"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        await recordUserEvent(getCtxUser(ctx).id, "ai_call", { feature: "social" });
        return JSON.parse(content);
          }
        );
      }),
    generateHooks: aiProcedure("social")
      .input(z.object({ productTitle: z.string(), region: regionCodeSchema.optional() }))
      .mutation(async ({ ctx, input }) => {
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        return withAiOutputCache(
          "social_hooks",
          { productTitle: input.productTitle, region },
          async () => {
        const [trend, ads] = await Promise.all([
          getTrendSignal(input.productTitle, region),
          getAdLibrarySnapshot(input.productTitle, region),
        ]);

        const prompt = `Write 5 scroll-stopping opening hooks (first line only) for short-form video about:
Product: ${input.productTitle}
Trend: ${trend?.momentumLabel ?? "unknown"}${trend?.risingQueries?.length ? `, rising: ${trend.risingQueries.slice(0, 3).join(", ")}` : ""}
${ads?.creatives?.[0]?.bodyText ? `Competitor sample: ${ads.creatives[0].bodyText.slice(0, 100)}` : ""}

Return JSON: { "hooks": string[] }`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "hooks",
              strict: true,
              schema: {
                type: "object",
                properties: { hooks: { type: "array", items: { type: "string" } } },
                required: ["hooks"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        await recordUserEvent(getCtxUser(ctx).id, "ai_call", { feature: "social" });
        return JSON.parse(content);
          }
        );
      }),
    generateContentCalendar: aiProcedure("social")
      .input(z.object({ productTitle: z.string(), region: regionCodeSchema.optional() }))
      .mutation(async ({ ctx, input }) => {
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        return withAiOutputCache(
          "social_calendar",
          { productTitle: input.productTitle, region },
          async () => {
        const trend = await getTrendSignal(input.productTitle, region);

        const prompt = `Create a 7-day social content calendar for selling: ${input.productTitle}
Trend momentum: ${trend?.momentumLabel ?? "stable"}
${trend?.risingQueries?.length ? `Rising queries: ${trend.risingQueries.slice(0, 5).join(", ")}` : ""}

Return JSON: { "days": [{ "day": number, "platform": "tiktok"|"instagram"|"facebook", "topic": string, "format": string }] }`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "calendar",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number" },
                        platform: { type: "string" },
                        topic: { type: "string" },
                        format: { type: "string" },
                      },
                      required: ["day", "platform", "topic", "format"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        await recordUserEvent(getCtxUser(ctx).id, "ai_call", { feature: "social" });
        return JSON.parse(content);
          }
        );
      }),
    generateSeoBlock: aiProcedure("social")
      .input(z.object({ productTitle: z.string(), benefit: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        return withAiOutputCache(
          "social_seo",
          { productTitle: input.productTitle, benefit: input.benefit ?? "" },
          async () => {
        const prompt = `Write SEO listing copy for an e-commerce product:
Product: ${input.productTitle}
${input.benefit ? `Key benefit: ${input.benefit}` : ""}

Return JSON: { "title": string, "metaDescription": string, "bulletPoints": string[] }`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "seo",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  metaDescription: { type: "string" },
                  bulletPoints: { type: "array", items: { type: "string" } },
                },
                required: ["title", "metaDescription", "bulletPoints"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        await recordUserEvent(getCtxUser(ctx).id, "ai_call", { feature: "social" });
        return JSON.parse(content);
          }
        );
      }),
    generateCaption: aiProcedure("social")
      .input(
        z.object({
          productTitle: z.string(),
          platform: z.enum(["tiktok", "instagram"]),
          region: regionCodeSchema.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        return withAiOutputCache(
          "social_caption",
          { productTitle: input.productTitle, platform: input.platform, region },
          async () => {
        const trend = await getTrendSignal(input.productTitle, region);
        const prompt = `Write a viral ${input.platform} caption for this product:
Product: ${input.productTitle}
${trend?.risingQueries?.length ? `Trending angles: ${trend.risingQueries.slice(0, 3).join(", ")}` : ""}

Make it engaging, include relevant emojis, and a hook that stops the scroll. Return as plain text.`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
        });

        await recordUserEvent(getCtxUser(ctx).id, "ai_call", { feature: "social" });
        return { caption: response.choices[0]?.message.content || "" };
          }
        );
      }),

    /** One AI call → full kit (hashtags, hooks, ads, calendar, SEO, captions) */
    generateFullKit: aiProcedure("social")
      .input(
        z.object({
          productTitle: z.string().min(1),
          productBenefit: z.string().optional(),
          region: regionCodeSchema.optional(),
          live: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = getCtxUser(ctx);
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        const benefit = input.productBenefit?.trim() ?? "";
        const cacheInput = {
          productTitle: input.productTitle,
          productBenefit: benefit,
          region,
        };

        return runSocialAiCached("social_full_kit", cacheInput, input.live, async () => {
        let creditsUsed = 0;

        const [trend, ads] = await Promise.all([
          getTrendSignal(input.productTitle, region, { live: input.live }),
          getAdLibrarySnapshot(input.productTitle, region),
        ]);
        if (input.live) {
          creditsUsed = await spendCredits(user, "social_live", { productTitle: input.productTitle });
        }
        const intel = buildIntelligenceContext(input.productTitle, trend, ads);

        const prompt = `Create a complete social media kit for this dropshipping product.

Product: ${input.productTitle}
${benefit ? `Key benefit: ${benefit}` : ""}

Market intelligence:
${intel}

Return JSON with:
- hashtags: 30 strings (no # prefix)
- hooks: 5 scroll-stopping video openers
- copies: 5 ad copy lines (50-100 chars each)
- days: 7-day calendar [{ day, platform, topic, format }]
- seo: { title, metaDescription, bulletPoints[] }
- tiktokCaption: full TikTok caption with emojis
- instagramCaption: full Instagram caption`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "full_social_kit",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hashtags: { type: "array", items: { type: "string" } },
                  hooks: { type: "array", items: { type: "string" } },
                  copies: { type: "array", items: { type: "string" } },
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number" },
                        platform: { type: "string" },
                        topic: { type: "string" },
                        format: { type: "string" },
                      },
                      required: ["day", "platform", "topic", "format"],
                      additionalProperties: false,
                    },
                  },
                  seo: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      metaDescription: { type: "string" },
                      bulletPoints: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "metaDescription", "bulletPoints"],
                    additionalProperties: false,
                  },
                  tiktokCaption: { type: "string" },
                  instagramCaption: { type: "string" },
                },
                required: [
                  "hashtags",
                  "hooks",
                  "copies",
                  "days",
                  "seo",
                  "tiktokCaption",
                  "instagramCaption",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        await recordUserEvent(user.id, "ai_call", { feature: "social" });
        const parsed = JSON.parse(content) as SocialKitPayload;
        return {
          kit: { ...parsed, generatedAt: new Date().toISOString() } satisfies SocialKitPayload,
          creditsUsed,
          trendSignal: trend,
          adSnapshot: ads,
        };
        });
      }),

    getKitLimits: protectedBase.query(async ({ ctx }) => {
      const user = getCtxUser(ctx);
      const plan = resolveEffectivePlan(user).effectivePlanId;
      const count = await countSavedSocialKits(user.id);
      const limit = savedSocialKitLimit(plan);
      return {
        planId: plan,
        savedCount: count,
        savedLimit: limit,
        savedLimitLabel: formatSavedKitLimit(plan),
        canSaveMore: canSaveMoreKits(plan, count),
      };
    }),

    listSavedKits: protectedBase.query(async ({ ctx }) => {
      const rows = await getSavedSocialKits(getCtxUser(ctx).id);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        productTitle: r.productTitle,
        productBenefit: r.productBenefit,
        region: r.region,
        productId: r.productId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    }),

    getSavedKit: protectedBase
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const row = await getSavedSocialKitById(input.id, getCtxUser(ctx).id);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Kit not found" });
        return {
          id: row.id,
          name: row.name,
          productTitle: row.productTitle,
          productBenefit: row.productBenefit,
          region: row.region,
          productId: row.productId,
          payload: row.payload as SocialKitPayload,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        };
      }),

    saveKit: featureProcedure("social")
      .input(
        z.object({
          name: z.string().min(1).max(255),
          productTitle: z.string().min(1).max(500),
          productBenefit: z.string().max(2000).optional(),
          region: regionCodeSchema.optional(),
          productId: z.string().max(128).optional(),
          payload: z.record(z.string(), z.unknown()),
          id: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = getCtxUser(ctx);
        const payloadBytes = Buffer.byteLength(JSON.stringify(input.payload), "utf8");
        if (payloadBytes > 512_000) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Kit payload too large (max 500KB). Remove large assets before saving.",
          });
        }
        const plan = resolveEffectivePlan(user).effectivePlanId;

        if (input.id) {
          const existing = await getSavedSocialKitById(input.id, user.id);
          if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Kit not found" });
          await updateSocialKit(input.id, user.id, {
            name: input.name,
            productBenefit: input.productBenefit,
            payload: input.payload,
          });
          return { id: input.id, updated: true };
        }

        const count = await countSavedSocialKits(user.id);
        if (!canSaveMoreKits(plan, count)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Saved kit limit reached (${formatSavedKitLimit(plan)} on your plan). Delete a kit or upgrade.`,
          });
        }

        const id = await saveSocialKit({
          userId: user.id,
          name: input.name,
          productTitle: input.productTitle,
          productBenefit: input.productBenefit,
          region: input.region,
          productId: input.productId,
          payload: input.payload,
        });
        return { id, updated: false };
      }),

    deleteSavedKit: featureProcedure("social")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSocialKit(input.id, getCtxUser(ctx).id);
        return { ok: true };
      }),
  }),

  // Market Gap Finder
  marketgap: router({
    findGaps: aiProcedure("marketgap")
      .input(
        z.object({
          niche: z.string(),
          platforms: z.array(z.string()),
          region: regionCodeSchema.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const region = (input.region ?? ENV.defaultRegion) as RegionCode;
        const [trend, ads] = await Promise.all([
          getTrendSignal(input.niche, region),
          getAdLibrarySnapshot(input.niche, region),
        ]);
        const intelContext = buildIntelligenceContext(input.niche, trend, ads);

        const prompt = `Analyze market gaps in the "${input.niche}" niche across ${input.platforms.join(", ")}:

Market intelligence:
${intelContext}

Identify:
1. Underserved niches with high demand but low supply
2. Emerging trends (Google Trends + social media correlation)
3. Cross-border opportunities
4. Competitor offering gaps

Return as JSON with gaps array, each containing: title, opportunity, demand_level, competition_level, estimated_margin.`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "market_gaps",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        opportunity: { type: "string" },
                        demand_level: { type: "string" },
                        competition_level: { type: "string" },
                        estimated_margin: { type: "string" },
                      },
                      required: ["title", "opportunity", "demand_level", "competition_level", "estimated_margin"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["gaps"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        await recordUserEvent(getCtxUser(ctx).id, "ai_call", { feature: "marketgap" });
        const parsed = JSON.parse(content) as {
          gaps: Array<{
            title: string;
            opportunity: string;
            demand_level: string;
            competition_level: string;
            estimated_margin: string;
          }>;
        };
        const coverage = intelCoverageLevel(trend, ads);
        return {
          gaps: parsed.gaps.map((gap) => ({
            ...gap,
            confidence: gapItemConfidence(gap.demand_level, gap.competition_level, coverage),
          })),
          intelContext: {
            trendFetchedAt: trend?.fetchedAt ?? null,
            adsFetchedAt: ads?.fetchedAt ?? null,
            trendStale: trend?.stale ?? false,
            adsStale: ads?.stale ?? false,
            coverage,
            summary: intelContext,
          },
        };
      }),
  }),

  // Pipeline Tracker
  pipeline: router({
    getPipelineItems: protectedBase.query(({ ctx }) => getPipelineItems(getCtxUser(ctx).id)),
    createPipelineItem: pipelineCreateProcedure()
      .input(
        z.object({
          productId: z.string().optional(),
          productTitle: z.string(),
          productImage: z.string().optional(),
          platform: z.string().optional(),
          price: z.number().optional(),
          sourceUrl: z.string().optional(),
          region: z.string().optional(),
          supplierPlatform: z.string().optional(),
          landedCost: z.number().optional(),
          selectedOfferId: z.number().optional(),
          stage: z.enum(["testing", "scaling", "paused", "dropped"]).default("testing"),
          validationScore: z.number().optional(),
          estimatedProfit: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => createPipelineItem({ userId: getCtxUser(ctx).id, ...input })),
    updatePipelineItem: protectedBase
      .input(z.object({ id: z.number(), stage: z.enum(["testing", "scaling", "paused", "dropped"]).optional(), notes: z.string().optional() }))
      .mutation(({ ctx, input }) => updatePipelineItem(input.id, getCtxUser(ctx).id, { stage: input.stage, notes: input.notes })),
    deletePipelineItem: protectedBase
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deletePipelineItem(input.id, getCtxUser(ctx).id)),
  }),

  // AI Agent Chat
  agent: router({
    getChatSessions: protectedBase.query(({ ctx }) => getChatSessions(getCtxUser(ctx).id)),
    createChatSession: protectedBase
      .input(z.object({ title: z.string().optional() }))
      .mutation(({ ctx, input }) => createChatSession(getCtxUser(ctx).id, input.title)),
    deleteChatSession: protectedBase
      .input(z.object({ sessionId: z.number() }))
      .mutation(({ ctx, input }) => deleteChatSession(input.sessionId, getCtxUser(ctx).id)),
    getChatMessages: protectedBase
      .input(z.object({ sessionId: z.number() }))
      .query(({ ctx, input }) => getChatMessages(input.sessionId, getCtxUser(ctx).id)),
    sendMessage: aiProcedure("agent")
      .input(z.object({ sessionId: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const user = getCtxUser(ctx);
        const userId = user.id;
        const owned = await chatSessionBelongsToUser(input.sessionId, userId);
        if (!owned) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chat session not found" });
        }

        const session = await getChatSession(input.sessionId, userId);
        const isFirstMessage = session?.title === "New Chat";

        await addChatMessage({
          sessionId: input.sessionId,
          userId,
          role: "user",
          content: input.content,
        });

        if (isFirstMessage) {
          const { generateSessionTitle } = await import("./agent/runAgent");
          const title = await generateSessionTitle(input.content);
          await updateChatSessionTitle(input.sessionId, userId, title);
        }

        const messages = await getChatMessages(input.sessionId, userId);
        const conversationHistory = messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

        const { runAgentConversation } = await import("./agent/runAgent");
        const { message: assistantMessage, totalTokens, toolCallsUsed } =
          await runAgentConversation(user, conversationHistory);

        await addChatMessage({
          sessionId: input.sessionId,
          userId,
          role: "assistant",
          content: assistantMessage,
        });

        await recordUserEvent(userId, "ai_call", {
          feature: "agent",
          tokens: totalTokens,
          toolCalls: toolCallsUsed,
        });

        return {
          message: assistantMessage,
          sessionTitle: isFirstMessage ? await getChatSession(input.sessionId, userId).then((s) => s?.title) : undefined,
          tokensUsed: totalTokens,
        };
      }),
    searchProductsTool: searchProcedure()
      .input(
        z.object({
          query: z.string().min(1),
          platform: z.enum(["all", "ebay", "amazon", "shopify", "tiktok"]).default("all"),
          region: regionCodeSchema.optional(),
        })
      )
      .query(async ({ input }) => {
        const { computeNextMoves } = await import("./ranking/nextMoves");
        const results = await runProductSearch(input.query, input.platform, {
          region: input.region,
        });
        return {
          query: input.query,
          resultCount: results.results.length,
          products: results.results.slice(0, 5).map((p) => ({
            title: p.title,
            price: p.price,
            platform: p.platform,
            trendScore: p.trendScore,
            rankReason: p.rankReason,
            rankingExplanation: p.rankingExplanation,
            nextMoves: computeNextMoves(p),
            canonicalProductId: p.canonicalProductId,
            sourceProvider: p.sourceProvider,
          })),
        };
      }),
  }),

  // Analytics
  analytics: router({
    recordDiscoverView: protectedBase
      .input(
        z.object({
          region: z.string().optional(),
          category: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        recordUserEvent(getCtxUser(ctx).id, "discover_view", {
          region: input.region,
          category: input.category,
        })
      ),
    recordProductEvent: protectedBase
      .input(
        z.object({
          eventType: z.enum([
            "product_impression",
            "product_click",
            "drawer_open",
            "watchlist_save",
            "pipeline_add",
            "ranking_explain_open",
          ]),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        recordUserEvent(getCtxUser(ctx).id, input.eventType, input.metadata ?? {})
      ),
    getDashboardMetrics: featureProcedure("analytics").query(async ({ ctx }) => {
      const user = getCtxUser(ctx);
      const subscription = await buildSubscriptionInfo(user);
      const hasAdvanced = subscription.features.includes("analytics_advanced");

      const watchlist = await getWatchlist(user.id);
      const pipeline = await getPipelineItems(user.id);
      const profits = await getProfitCalculations(user.id);

      const totalRevenue = profits.reduce((sum, p) => sum + (p.sellingPrice ?? 0), 0);
      const totalProfit = profits.reduce((sum, p) => sum + (p.netProfit ?? 0), 0);
      const averageMargin =
        profits.length > 0
          ? profits.reduce((sum, p) => sum + (p.roi ?? 0), 0) / profits.length
          : 0;

      const profitByProduct = hasAdvanced
        ? profits.slice(0, 8).map((p) => ({
            product: p.productTitle.length > 24 ? `${p.productTitle.slice(0, 24)}…` : p.productTitle,
            profit: Math.round(p.netProfit ?? 0),
            revenue: Math.round(p.sellingPrice ?? 0),
          }))
        : [];

      const now = new Date();
      const trendData = hasAdvanced
        ? Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const label = d.toLocaleString("en-US", { month: "short" });
            const monthPipeline = pipeline.filter((p) => {
              const created = p.createdAt ? new Date(p.createdAt) : null;
              return created && created >= monthStart && created <= monthEnd;
            });
            const monthProfits = profits.filter((p) => {
              const created = p.createdAt ? new Date(p.createdAt) : null;
              return created && created >= monthStart && created <= monthEnd;
            });
            return {
              month: label,
              products: monthPipeline.length,
              revenue: Math.round(monthProfits.reduce((s, p) => s + (p.sellingPrice ?? 0), 0)),
            };
          })
        : [];

      const discoverViews = hasAdvanced ? await countUserEvents(user.id, "discover_view") : 0;
      const impressions = hasAdvanced ? await countUserEvents(user.id, "product_impression") : 0;
      const clicks = hasAdvanced ? await countUserEvents(user.id, "product_click") : 0;
      const saves = hasAdvanced ? await countUserEvents(user.id, "watchlist_save") : 0;
      const discoveryFunnel = hasAdvanced
        ? {
            impressions,
            clicks,
            saves,
            pipelineAdds: await countUserEvents(user.id, "pipeline_add"),
            ctr: impressions > 0 ? Math.round((clicks / impressions) * 100) : 0,
            saveRate: clicks > 0 ? Math.round((saves / clicks) * 100) : 0,
          }
        : null;
      const searchToPipeline = hasAdvanced ? pipeline.filter((p) => p.sourceUrl).length : 0;
      const validateToPipeline = hasAdvanced
        ? pipeline.filter((p) => p.validationScore != null).length
        : 0;
      const withLandedCost = hasAdvanced ? pipeline.filter((p) => p.landedCost != null).length : 0;

      return {
        hasAdvancedAnalytics: hasAdvanced,
        totalWatchlistItems: watchlist.length,
        discoverViews,
        discoveryFunnel,
        searchToPipeline,
        validateToPipeline,
        withLandedCost,
        activeProducts: pipeline.filter((p) => p.stage === "testing" || p.stage === "scaling").length,
        totalRevenue: Math.round(totalRevenue),
        totalProfit: Math.round(totalProfit),
        averageMargin: Math.round(averageMargin * 10) / 10,
        pipelineByStage: {
          testing: pipeline.filter((p) => p.stage === "testing").length,
          scaling: pipeline.filter((p) => p.stage === "scaling").length,
          paused: pipeline.filter((p) => p.stage === "paused").length,
          dropped: pipeline.filter((p) => p.stage === "dropped").length,
        },
        totalProfitCalculations: profits.length,
        averageProfit: profits.length > 0 ? totalProfit / profits.length : 0,
        profitByProduct,
        trendData,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
