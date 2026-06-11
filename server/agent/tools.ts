import type { User } from "../../drizzle/schema";
import type { Tool } from "../_core/llm";
import { ENV } from "../_core/env";
import { invokeLLMOrThrow } from "../_core/aiHelpers";
import { addToWatchlist, recordUserEvent } from "../db";
import { getTrendSignal } from "../intelligence/trends";
import { getAdLibrarySnapshot } from "../intelligence/adLibrary";
import { buildIntelligenceContext } from "../intelligence/summary";
import { computeNextMoves } from "../ranking/nextMoves";
import { searchProducts as runProductSearch } from "../search";
import type { RegionCode } from "@shared/searchTypes";

export const AGENT_TOOL_DEFINITIONS: Tool[] = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description:
        "Search marketplace listings for a product keyword. Returns top matches with trend scores, ranking explanations, and source URLs.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Product search keyword" },
          platform: {
            type: "string",
            enum: ["all", "ebay", "amazon", "shopify", "tiktok"],
            description: "Marketplace filter",
          },
          region: {
            type: "string",
            enum: ["US", "UK", "EU", "GLOBAL"],
            description: "Target market region",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addToWatchlist",
      description: "Save a product to the user's watchlist for ongoing monitoring.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          productTitle: { type: "string" },
          platform: { type: "string" },
          price: { type: "number" },
          sourceUrl: { type: "string" },
          productImage: { type: "string" },
          region: { type: "string" },
        },
        required: ["productId", "productTitle", "platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "validateProduct",
      description:
        "Run AI viability analysis on a specific product (trend, saturation, profit potential).",
      parameters: {
        type: "object",
        properties: {
          productTitle: { type: "string" },
          platform: { type: "string" },
          price: { type: "number" },
          region: {
            type: "string",
            enum: ["US", "UK", "EU", "GLOBAL"],
          },
        },
        required: ["productTitle", "platform", "price"],
      },
    },
  },
];

export async function executeAgentTool(
  user: User,
  name: string,
  argsJson: string
): Promise<Record<string, unknown>> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return { error: "Invalid tool arguments JSON" };
  }

  switch (name) {
    case "searchProducts":
      return executeSearchProducts(user, args);
    case "addToWatchlist":
      return executeAddToWatchlist(user, args);
    case "validateProduct":
      return executeValidateProduct(user, args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function executeSearchProducts(
  user: User,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const query = String(args.query ?? "").trim();
  if (!query) return { error: "query is required" };

  const platform = (args.platform as string) ?? "all";
  const region = (args.region as RegionCode | undefined) ?? (ENV.defaultRegion as RegionCode);

  const results = await runProductSearch(query, platform as "all", { region });
  await recordUserEvent(user.id, "search_query", {
    query,
    platform,
    source: "agent",
    live: false,
  });

  return {
    query,
    resultCount: results.results.length,
    dataMode: results.dataMode ?? "cached",
    products: results.results.slice(0, 5).map((p) => ({
      productId: p.canonicalProductId ?? p.id,
      title: p.title,
      price: p.price,
      currency: p.currency ?? "USD",
      platform: p.platform,
      trendScore: p.trendScore,
      rankReason: p.rankReason,
      rankingSummary: p.rankingExplanation?.summary ?? null,
      sourceUrl: p.sourceUrl,
      nextMoves: computeNextMoves(p),
    })),
  };
}

async function executeAddToWatchlist(
  user: User,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const productId = String(args.productId ?? "").trim();
  const productTitle = String(args.productTitle ?? "").trim();
  const platform = String(args.platform ?? "").trim();

  if (!productId || !productTitle || !platform) {
    return { error: "productId, productTitle, and platform are required" };
  }

  await addToWatchlist({
    userId: user.id,
    productId,
    productTitle,
    platform,
    price: typeof args.price === "number" ? args.price : undefined,
    sourceUrl: typeof args.sourceUrl === "string" ? args.sourceUrl : undefined,
    productImage: typeof args.productImage === "string" ? args.productImage : undefined,
    region: typeof args.region === "string" ? args.region : undefined,
  });

  await recordUserEvent(user.id, "watchlist_save", { productId, source: "agent" });

  return {
    success: true,
    message: `Added "${productTitle}" to watchlist`,
    productId,
  };
}

async function executeValidateProduct(
  user: User,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const productTitle = String(args.productTitle ?? "").trim();
  const platform = String(args.platform ?? "").trim();
  const price = Number(args.price);
  const region = ((args.region as RegionCode | undefined) ?? ENV.defaultRegion) as RegionCode;

  if (!productTitle || !platform || !Number.isFinite(price)) {
    return { error: "productTitle, platform, and price are required" };
  }

  const [trend, ads] = await Promise.all([
    getTrendSignal(productTitle, region, { live: false }),
    getAdLibrarySnapshot(productTitle, region, { live: false }),
  ]);
  const intelContext = buildIntelligenceContext(productTitle, trend, ads);

  const prompt = `Analyze this product for dropshipping viability:
Product: ${productTitle}
Platform: ${platform}
Price: $${price}

Market intelligence (cached daily data):
${intelContext}

Provide a JSON response with trendScore, saturationScore, profitPotential, supplierReliability, overallScore, and reasoning.`;

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
          required: [
            "trendScore",
            "saturationScore",
            "profitPotential",
            "supplierReliability",
            "overallScore",
            "reasoning",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  if (!content || typeof content !== "string") {
    return { error: "Validation failed — no AI response" };
  }

  await recordUserEvent(user.id, "ai_call", { feature: "validate", source: "agent" });

  return {
    ...JSON.parse(content),
    productTitle,
    platform,
    price,
  };
}
