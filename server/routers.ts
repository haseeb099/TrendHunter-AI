import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { hashPassword, verifyPassword } from "./_core/password";
import { createSessionToken, setSessionCookie } from "./_core/session";
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
  getProfitCalculations,
  saveProfitCalculation,
  deleteProfitCalculation,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getUserByEmail,
  countUsers,
  createUser,
  getFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
  countUserEvents,
  recordUserEvent,
} from "./db";
import { invokeLLMOrThrow } from "./_core/aiHelpers";
import { getSearchProviderStatus, searchProducts as runProductSearch } from "./search";
import {
  PRODUCT_CATEGORIES,
  REGION_LABELS,
  SHIP_FROM_OPTIONS,
  SORT_OPTIONS,
  type ProductHuntFilters,
  type RegionCode,
} from "@shared/searchTypes";
import { ENV } from "./_core/env";
import { getSupportedRegionOptions } from "./search/regions";
import { getTrendingFeed } from "./trending";
import { getOffersForProduct, getOffersStatus } from "./suppliers";
import { getStorageStatus, storageGet, storagePut } from "./storage";

const regionCodeSchema = z.enum(["US", "UK", "EU", "GLOBAL"]);
const shipFromSchema = z.enum(["US", "UK", "CN", "EU"]);
const sortSchema = z.enum(["price_asc", "price_desc", "trend_score", "rating"]);

const productHuntFiltersSchema = z
  .object({
    priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
    region: regionCodeSchema.optional(),
    category: z.string().optional(),
    shipFrom: z.array(shipFromSchema).optional(),
    sort: sortSchema.optional(),
    minRating: z.number().optional(),
    maxShippingDays: z.number().optional(),
  })
  .optional();

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8, "Password must be at least 8 characters"),
          name: z.string().min(1).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
        }

        const openId = nanoid();
        const isFirstUser = (await countUsers()) === 0;
        const user = await createUser({
          openId,
          email: input.email,
          name: input.name ?? input.email.split("@")[0] ?? "User",
          passwordHash: hashPassword(input.password),
          loginMethod: "local",
          role: isFirstUser ? "admin" : "user",
          lastSignedIn: new Date(),
        });

        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
        }

        const token = await createSessionToken(user.openId, user.name ?? "");
        setSessionCookie(ctx.req, ctx.res, token);
        return user;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        const token = await createSessionToken(user.openId, user.name ?? "");
        setSessionCookie(ctx.req, ctx.res, token);
        return user;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Search & Discovery
  search: router({
    getSavedSearches: protectedProcedure.query(({ ctx }) => getSavedSearches(ctx.user.id)),
    saveSearch: protectedProcedure
      .input(z.object({ query: z.string(), filters: z.unknown().optional() }))
      .mutation(({ ctx, input }) => createSavedSearch(ctx.user.id, input.query, input.filters)),
    deleteSavedSearch: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteSavedSearch(input.id, ctx.user.id)),
    getProviderStatus: protectedProcedure.query(() => getSearchProviderStatus()),
    getFilterOptions: protectedProcedure.query(() => ({
      regions: getSupportedRegionOptions(),
      categories: PRODUCT_CATEGORIES.map((c) => ({
        value: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
      })),
      shipFromOptions: SHIP_FROM_OPTIONS,
      sortOptions: SORT_OPTIONS,
      defaultRegion: ENV.defaultRegion,
      supportedRegions: ENV.supportedRegions,
      regionLabels: REGION_LABELS,
    })),
    getFilterPresets: protectedProcedure.query(({ ctx }) => getFilterPresets(ctx.user.id)),
    saveFilterPreset: protectedProcedure
      .input(z.object({ name: z.string().min(1), filters: productHuntFiltersSchema }))
      .mutation(({ ctx, input }) =>
        saveFilterPreset(ctx.user.id, input.name, (input.filters ?? {}) as ProductHuntFilters)
      ),
    deleteFilterPreset: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteFilterPreset(input.id, ctx.user.id)),
    searchProducts: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1),
          platform: z.enum(["all", "ebay", "amazon", "shopify", "tiktok"]),
          filters: productHuntFiltersSchema,
        })
      )
      .query(async ({ input }) => {
        return runProductSearch(
          input.query,
          input.platform,
          input.filters as ProductHuntFilters | undefined
        );
      }),
  }),

  trending: router({
    getFeed: publicProcedure
      .input(
        z.object({
          region: regionCodeSchema.optional(),
          category: z.string().optional(),
        })
      )
      .query(({ input }) =>
        getTrendingFeed({
          region: input.region as RegionCode | undefined,
          category: input.category,
        })
      ),
    getRegions: publicProcedure.query(() => ({
      defaultRegion: ENV.defaultRegion,
      regions: getSupportedRegionOptions(),
    })),
    getCategories: publicProcedure
      .input(z.object({ region: regionCodeSchema.optional() }))
      .query(() => ({
        categories: PRODUCT_CATEGORIES.map((c) => ({
          value: c,
          label: c.charAt(0).toUpperCase() + c.slice(1),
        })),
      })),
  }),

  upload: router({
    getStatus: protectedProcedure.query(() => getStorageStatus()),
    getUrl: protectedProcedure
      .input(z.object({ key: z.string().min(1) }))
      .query(({ input }) => storageGet(input.key)),
    uploadFile: protectedProcedure
      .input(
        z.object({
          filename: z.string().min(1).max(255),
          contentType: z.string().min(1).max(128),
          dataBase64: z.string().max(8_000_000),
          folder: z.string().max(64).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const folder = (input.folder ?? "uploads").replace(/[^a-zA-Z0-9/_-]/g, "");
        const buffer = Buffer.from(input.dataBase64, "base64");
        if (buffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File exceeds 5 MB limit" });
        }
        return storagePut(`${folder}/${safeName}`, buffer, input.contentType);
      }),
  }),

  // Watchlist
  watchlist: router({
    getWatchlist: protectedProcedure.query(({ ctx }) => getWatchlist(ctx.user.id)),
    addToWatchlist: protectedProcedure
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
      .mutation(({ ctx, input }) => addToWatchlist({ userId: ctx.user.id, ...input })),
    removeFromWatchlist: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => removeFromWatchlist(input.id, ctx.user.id)),
  }),

  // Product Validation (AI-powered)
  validate: router({
    validateProduct: protectedProcedure
      .input(z.object({ productTitle: z.string(), platform: z.string(), price: z.number() }))
      .mutation(async ({ input }) => {
        // Use LLM to generate validation scores
        const prompt = `Analyze this product for dropshipping viability:
Product: ${input.productTitle}
Platform: ${input.platform}
Price: $${input.price}

Provide a JSON response with:
- trendScore (0-100): Is demand rising?
- saturationScore (0-100): How saturated is this niche?
- profitPotential (0-100): Margin potential?
- supplierReliability (0-100): Typical supplier quality?
- overallScore (0-100): Overall viability

Also include brief reasoning for each score.`;

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
                },
                required: ["trendScore", "saturationScore", "profitPotential", "supplierReliability", "overallScore", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");
        return JSON.parse(content);
      }),
  }),

  // Competitor Spy
  competitor: router({
    analyzeCompetitor: protectedProcedure
      .input(
        z.object({
          url: z.string().optional(),
          keyword: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const keyword = input.keyword?.trim() ?? "";
        const url = input.url?.trim() ?? "";

        let marketplaceContext = "";
        if (keyword) {
          try {
            const searchResult = await runProductSearch(keyword, "all", {
              sort: "price_asc",
            });
            const top = searchResult.results.slice(0, 6);
            if (top.length > 0) {
              marketplaceContext = `\n\nLive marketplace snapshot (${searchResult.isDemo ? "demo" : "live"} data):\n${top
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

        const prompt = `Analyze this competitor listing/store:
${url ? `URL: ${url}` : "URL: not provided"}
${keyword ? `Keyword focus: ${keyword}` : ""}${marketplaceContext}

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

        return {
          analysis: parsed,
          timestamp: new Date(),
        };
      }),
  }),

  // Profit Calculator
  profit: router({
    getProfitCalculations: protectedProcedure.query(({ ctx }) => getProfitCalculations(ctx.user.id)),
    calculateProfit: protectedProcedure
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
          userId: ctx.user.id,
          ...input,
          netProfit,
          roi,
          breakEvenAdSpend,
        };

        await saveProfitCalculation(calc);
        return calc;
      }),
    deleteProfitCalculation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteProfitCalculation(input.id, ctx.user.id)),
  }),

  // Supplier Vetting
  supplier: router({
    getSuppliers: protectedProcedure.query(({ ctx }) => getSuppliers(ctx.user.id)),
    createSupplier: protectedProcedure
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
      .mutation(({ ctx, input }) => createSupplier({ userId: ctx.user.id, ...input })),
    updateSupplier: protectedProcedure
      .input(z.object({ id: z.number(), data: z.unknown() }))
      .mutation(({ ctx, input }) => updateSupplier(input.id, ctx.user.id, input.data as any)),
    deleteSupplier: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteSupplier(input.id, ctx.user.id)),
    vetSupplier: protectedProcedure
      .input(z.object({ supplierId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await updateSupplier(input.supplierId, ctx.user.id, {
          sampleOrdered: true,
          sampleStatus: "ordered",
          sampleOrderDate: new Date(),
        });
        return { status: "sample_ordered", estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      }),
    getOffersForProduct: protectedProcedure
      .input(
        z.object({
          productId: z.string().optional(),
          title: z.string().min(1),
          region: regionCodeSchema.optional(),
        })
      )
      .query(({ input }) =>
        getOffersForProduct({
          productId: input.productId,
          title: input.title,
          region: input.region as RegionCode | undefined,
        })
      ),
    getOffersStatus: protectedProcedure.query(() => getOffersStatus()),
  }),

  // Social Media Kit
  social: router({
    generateHashtags: protectedProcedure
      .input(z.object({ productTitle: z.string(), niche: z.string().optional() }))
      .mutation(async ({ input }) => {
        const prompt = `Generate 30 trending hashtags for this product on TikTok and Instagram:
Product: ${input.productTitle}
${input.niche ? `Niche: ${input.niche}` : ""}

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
        return JSON.parse(content);
      }),
    generateAdCopy: protectedProcedure
      .input(z.object({ productTitle: z.string(), productBenefit: z.string() }))
      .mutation(async ({ input }) => {
        const prompt = `Write 5 compelling ad copy variations for this product:
Product: ${input.productTitle}
Key Benefit: ${input.productBenefit}

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
        return JSON.parse(content);
      }),
    generateCaption: protectedProcedure
      .input(z.object({ productTitle: z.string(), platform: z.enum(["tiktok", "instagram"]) }))
      .mutation(async ({ input }) => {
        const prompt = `Write a viral ${input.platform} caption for this product:
Product: ${input.productTitle}

Make it engaging, include relevant emojis, and a hook that stops the scroll. Return as plain text.`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "user", content: prompt }],
        });

        return { caption: response.choices[0]?.message.content || "" };
      }),
  }),

  // Market Gap Finder
  marketgap: router({
    findGaps: protectedProcedure
      .input(z.object({ niche: z.string(), platforms: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        const prompt = `Analyze market gaps in the "${input.niche}" niche across ${input.platforms.join(", ")}:

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
        return JSON.parse(content);
      }),
  }),

  // Pipeline Tracker
  pipeline: router({
    getPipelineItems: protectedProcedure.query(({ ctx }) => getPipelineItems(ctx.user.id)),
    createPipelineItem: protectedProcedure
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
      .mutation(({ ctx, input }) => createPipelineItem({ userId: ctx.user.id, ...input })),
    updatePipelineItem: protectedProcedure
      .input(z.object({ id: z.number(), stage: z.enum(["testing", "scaling", "paused", "dropped"]).optional(), notes: z.string().optional() }))
      .mutation(({ ctx, input }) => updatePipelineItem(input.id, ctx.user.id, { stage: input.stage, notes: input.notes })),
    deletePipelineItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deletePipelineItem(input.id, ctx.user.id)),
  }),

  // AI Agent Chat
  agent: router({
    getChatSessions: protectedProcedure.query(({ ctx }) => getChatSessions(ctx.user.id)),
    createChatSession: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(({ ctx, input }) => createChatSession(ctx.user.id, input.title)),
    deleteChatSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(({ ctx, input }) => deleteChatSession(input.sessionId, ctx.user.id)),
    getChatMessages: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(({ ctx, input }) => getChatMessages(input.sessionId, ctx.user.id)),
    sendMessage: protectedProcedure
      .input(z.object({ sessionId: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Add user message
        await addChatMessage({
          sessionId: input.sessionId,
          userId: ctx.user.id,
          role: "user",
          content: input.content,
        });

        // Get conversation history
        const messages = await getChatMessages(input.sessionId, ctx.user.id);
        const conversationHistory = messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

        // Generate AI response
        const systemPrompt = `You are DropHunter AI, an expert product research and sourcing advisor for dropshippers. 
Help users find winning products, validate opportunities, spy on competitors, and launch marketing campaigns.
Provide actionable insights, data-driven recommendations, and strategic guidance.
Be concise but thorough. Ask clarifying questions when needed.`;

        const response = await invokeLLMOrThrow({
          messages: [{ role: "system", content: systemPrompt }, ...conversationHistory],
        });

        const content = response.choices[0]?.message.content;
        const assistantMessage = typeof content === "string" ? content : "I couldn't generate a response. Please try again.";

        // Add assistant message
        await addChatMessage({
          sessionId: input.sessionId,
          userId: ctx.user.id,
          role: "assistant",
          content: assistantMessage,
        });

        return { message: assistantMessage };
      }),
  }),

  // Analytics
  analytics: router({
    recordDiscoverView: protectedProcedure
      .input(
        z.object({
          region: z.string().optional(),
          category: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        recordUserEvent(ctx.user.id, "discover_view", {
          region: input.region,
          category: input.category,
        })
      ),
    getDashboardMetrics: protectedProcedure.query(async ({ ctx }) => {
      const watchlist = await getWatchlist(ctx.user.id);
      const pipeline = await getPipelineItems(ctx.user.id);
      const profits = await getProfitCalculations(ctx.user.id);

      const totalRevenue = profits.reduce((sum, p) => sum + (p.sellingPrice ?? 0), 0);
      const totalProfit = profits.reduce((sum, p) => sum + (p.netProfit ?? 0), 0);
      const averageMargin =
        profits.length > 0
          ? profits.reduce((sum, p) => sum + (p.roi ?? 0), 0) / profits.length
          : 0;

      const profitByProduct = profits.slice(0, 8).map((p) => ({
        product: p.productTitle.length > 24 ? `${p.productTitle.slice(0, 24)}…` : p.productTitle,
        profit: Math.round(p.netProfit ?? 0),
        revenue: Math.round(p.sellingPrice ?? 0),
      }));

      const now = new Date();
      const trendData = Array.from({ length: 6 }, (_, i) => {
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
      });

      const discoverViews = await countUserEvents(ctx.user.id, "discover_view");
      const searchToPipeline = pipeline.filter((p) => p.sourceUrl).length;
      const validateToPipeline = pipeline.filter((p) => p.validationScore != null).length;
      const withLandedCost = pipeline.filter((p) => p.landedCost != null).length;

      return {
        totalWatchlistItems: watchlist.length,
        discoverViews,
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
