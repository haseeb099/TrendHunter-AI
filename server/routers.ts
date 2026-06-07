import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
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
} from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Search & Discovery
  search: router({
    getSavedSearches: protectedProcedure.query(({ ctx }) => getSavedSearches(ctx.user.id)),
    savSearch: protectedProcedure
      .input(z.object({ query: z.string(), filters: z.unknown().optional() }))
      .mutation(({ ctx, input }) => createSavedSearch(ctx.user.id, input.query, input.filters)),
    deleteSavedSearch: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteSavedSearch(input.id, ctx.user.id)),
    // Mock multi-platform search
    searchProducts: protectedProcedure
      .input(z.object({ query: z.string(), platform: z.string(), filters: z.unknown().optional() }))
      .query(async ({ input }) => {
        // In production, integrate with actual APIs (eBay, Amazon, Shopify, TikTok)
        // For now, return mock data
        return {
          results: [
            {
              id: "1",
              title: "Premium Wireless Headphones",
              price: 45.99,
              platform: input.platform,
              image: "https://via.placeholder.com/200",
              shippingDays: 5,
              supplier: "AliExpress",
              rating: 4.5,
            },
            {
              id: "2",
              title: "Portable Phone Charger",
              price: 12.99,
              platform: input.platform,
              image: "https://via.placeholder.com/200",
              shippingDays: 7,
              supplier: "Amazon",
              rating: 4.8,
            },
          ],
        };
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

        const response = await invokeLLM({
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
      .input(z.object({ url: z.string(), keyword: z.string().optional() }))
      .mutation(async ({ input }) => {
        const prompt = `Analyze this competitor listing/store:
URL: ${input.url}
${input.keyword ? `Keyword focus: ${input.keyword}` : ""}

Provide competitive intelligence in JSON format:
- pricing: estimated price range
- reviewSentiment: positive/neutral/negative
- salesVelocity: estimated monthly sales (low/medium/high)
- adSpend: estimated monthly ad spend (if detectable)
- topProducts: list of top 3 products
- gaps: identified market gaps`;

        const response = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
        });

        return {
          analysis: response.choices[0]?.message.content || "Analysis complete",
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
      .mutation(async () => {
        // Mark sample as ordered
        return { status: "sample_ordered", estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      }),
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

        const response = await invokeLLM({
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

        const response = await invokeLLM({
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

        const response = await invokeLLM({
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

        const response = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
        });

        return { gaps: response.choices[0]?.message.content || "" };
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

        const response = await invokeLLM({
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

  // Analytics (mock for now)
  analytics: router({
    getDashboardMetrics: protectedProcedure.query(async ({ ctx }) => {
      const watchlist = await getWatchlist(ctx.user.id);
      const pipeline = await getPipelineItems(ctx.user.id);
      const profits = await getProfitCalculations(ctx.user.id);

      return {
        totalWatchlistItems: watchlist.length,
        pipelineByStage: {
          testing: pipeline.filter((p) => p.stage === "testing").length,
          scaling: pipeline.filter((p) => p.stage === "scaling").length,
          paused: pipeline.filter((p) => p.stage === "paused").length,
          dropped: pipeline.filter((p) => p.stage === "dropped").length,
        },
        totalProfitCalculations: profits.length,
        averageProfit: profits.length > 0 ? profits.reduce((sum, p) => sum + (p.netProfit || 0), 0) / profits.length : 0,
        trendData: [
          { month: "Jan", products: 5, revenue: 1200 },
          { month: "Feb", products: 8, revenue: 2100 },
          { month: "Mar", products: 12, revenue: 3500 },
          { month: "Apr", products: 15, revenue: 4800 },
        ],
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
