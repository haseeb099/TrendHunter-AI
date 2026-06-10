import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  planId: mysqlEnum("planId", ["trial", "starter", "pro", "business", "agency"])
    .default("trial")
    .notNull(),
  planStatus: mysqlEnum("planStatus", ["active", "expired", "cancelled"])
    .default("active")
    .notNull(),
  trialStartedAt: timestamp("trialStartedAt"),
  trialEndsAt: timestamp("trialEndsAt"),
  planStartedAt: timestamp("planStartedAt"),
  planExpiresAt: timestamp("planExpiresAt"),
  hasUsedTrial: boolean("hasUsedTrial").default(false).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  accountStatus: mysqlEnum("accountStatus", ["active", "deactivated", "flagged", "paused"])
    .default("active")
    .notNull(),
  flagReason: varchar("flagReason", { length: 512 }),
  adminNotes: text("adminNotes"),
  limitOverrides: json("limitOverrides"),
  pausedUntil: timestamp("pausedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Saved product searches
export const savedSearches = mysqlTable("saved_searches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  query: varchar("query", { length: 255 }).notNull(),
  filters: json("filters"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedSearch = typeof savedSearches.$inferSelect;

// Trending feed snapshots
export const trendingSnapshots = mysqlTable("trending_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  region: varchar("region", { length: 16 }).notNull(),
  category: varchar("category", { length: 64 }),
  payload: json("payload").notNull(),
  sources: json("sources"),
  isDemo: boolean("isDemo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type TrendingSnapshot = typeof trendingSnapshots.$inferSelect;

// Supplier product offers cache
export const productOffers = mysqlTable("product_offers", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 255 }),
  productTitle: text("productTitle").notNull(),
  supplierPlatform: mysqlEnum("supplierPlatform", ["cj", "aliexpress", "manual"]).notNull(),
  supplierSku: varchar("supplierSku", { length: 255 }),
  warehouse: varchar("warehouse", { length: 64 }),
  shipFrom: varchar("shipFrom", { length: 8 }),
  unitCost: float("unitCost").notNull(),
  shippingCost: float("shippingCost").default(0).notNull(),
  moq: int("moq").default(1),
  processingDays: int("processingDays"),
  shippingDaysMin: int("shippingDaysMin"),
  shippingDaysMax: int("shippingDaysMax"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  raw: json("raw"),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
});

export type ProductOfferRow = typeof productOffers.$inferSelect;

// Named filter presets
export const savedFilterPresets = mysqlTable("saved_filter_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  filters: json("filters").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedFilterPreset = typeof savedFilterPresets.$inferSelect;

// User activity events (discover views, workflow actions)
export const userEvents = mysqlTable("user_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserEvent = typeof userEvents.$inferSelect;

// Product watchlist
export const watchlistItems = mysqlTable("watchlist_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: varchar("productId", { length: 255 }).notNull(),
  productTitle: text("productTitle").notNull(),
  productImage: text("productImage"),
  platform: varchar("platform", { length: 64 }).notNull(),
  price: float("price"),
  sourceUrl: text("sourceUrl"),
  region: varchar("region", { length: 16 }),
  supplierPlatform: varchar("supplierPlatform", { length: 32 }),
  landedCost: float("landedCost"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = typeof watchlistItems.$inferInsert;

// Product pipeline (kanban)
export const pipelineItems = mysqlTable("pipeline_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: varchar("productId", { length: 255 }),
  productTitle: text("productTitle").notNull(),
  productImage: text("productImage"),
  platform: varchar("platform", { length: 64 }),
  price: float("price"),
  sourceUrl: text("sourceUrl"),
  region: varchar("region", { length: 16 }),
  supplierPlatform: varchar("supplierPlatform", { length: 32 }),
  landedCost: float("landedCost"),
  selectedOfferId: int("selectedOfferId"),
  stage: mysqlEnum("stage", ["testing", "scaling", "paused", "dropped"]).default("testing").notNull(),
  validationScore: int("validationScore"),
  estimatedProfit: float("estimatedProfit"),
  notes: text("notes"),
  testResults: json("testResults"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipelineItem = typeof pipelineItems.$inferSelect;
export type InsertPipelineItem = typeof pipelineItems.$inferInsert;

// AI chat sessions
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).default("New Chat").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;

// AI chat messages
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Saved profit calculations
export const profitCalculations = mysqlTable("profit_calculations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productTitle: text("productTitle").notNull(),
  productCost: float("productCost").notNull(),
  shippingCost: float("shippingCost").default(0).notNull(),
  platformFee: float("platformFee").default(0).notNull(),
  adSpend: float("adSpend").default(0).notNull(),
  vatDuties: float("vatDuties").default(0).notNull(),
  sellingPrice: float("sellingPrice").notNull(),
  platform: varchar("platform", { length: 64 }),
  netProfit: float("netProfit"),
  roi: float("roi"),
  breakEvenAdSpend: float("breakEvenAdSpend"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProfitCalculation = typeof profitCalculations.$inferSelect;
export type InsertProfitCalculation = typeof profitCalculations.$inferInsert;

// Supplier records
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }),
  platform: varchar("platform", { length: 100 }),
  shippingDaysMin: int("shippingDaysMin"),
  shippingDaysMax: int("shippingDaysMax"),
  moq: int("moq"),
  reliabilityScore: float("reliabilityScore"),
  communicationScore: float("communicationScore"),
  qualityScore: float("qualityScore"),
  profileUrl: text("profileUrl"),
  notes: text("notes"),
  sampleOrdered: boolean("sampleOrdered").default(false),
  sampleStatus: varchar("sampleStatus", { length: 64 }),
  sampleOrderDate: timestamp("sampleOrderDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// Admin audit trail
export const adminAuditLog = mysqlTable("admin_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  targetUserId: int("targetUserId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;

// Editable subscription plans (super-admin controlled)
export const planConfigs = mysqlTable("plan_configs", {
  planId: mysqlEnum("planId", ["trial", "starter", "pro", "business", "agency"]).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  tagline: text("tagline"),
  priceMonthly: float("priceMonthly").default(0).notNull(),
  priceLabel: varchar("priceLabel", { length: 32 }).default("Free").notNull(),
  billingPeriod: varchar("billingPeriod", { length: 64 }).default("per month").notNull(),
  highlight: boolean("highlight").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  trialDays: int("trialDays").default(3),
  features: json("features").notNull(),
  featureIds: json("featureIds").notNull(),
  limits: json("limits").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlanConfigRow = typeof planConfigs.$inferSelect;

export const platformSettings = mysqlTable("platform_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  description: text("description"),
  couponType: mysqlEnum("couponType", [
    "grant_plan",
    "extend_trial",
    "extend_subscription",
    "bonus_searches",
    "discount_percent",
  ]).notNull(),
  value: float("value").notNull(),
  grantPlanId: mysqlEnum("grantPlanId", ["trial", "starter", "pro", "business", "agency"]),
  maxRedemptions: int("maxRedemptions").default(-1).notNull(),
  redemptionCount: int("redemptionCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

export const couponRedemptions = mysqlTable("coupon_redemptions", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(),
  userId: int("userId").notNull(),
  stripePromotionCodeId: varchar("stripePromotionCodeId", { length: 255 }),
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
});

export type CouponRedemption = typeof couponRedemptions.$inferSelect;

export const stripeWebhookEvents = mysqlTable("stripe_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 255 }).notNull().unique(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;

// Normalized product catalog (daily ingest from free sources)
export const catalogProducts = mysqlTable("catalog_products", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 255 }).notNull(),
  source: varchar("source", { length: 64 }).notNull(),
  title: text("title").notNull(),
  price: float("price").notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  image: text("image"),
  rating: float("rating"),
  category: varchar("category", { length: 64 }),
  region: varchar("region", { length: 16 }),
  currency: varchar("currency", { length: 8 }).default("USD"),
  sourceUrl: text("sourceUrl"),
  payload: json("payload"),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
});

export type CatalogProduct = typeof catalogProducts.$inferSelect;

// Cached keyword search results
export const searchSnapshots = mysqlTable("search_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  query: varchar("query", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  region: varchar("region", { length: 16 }).notNull(),
  payload: json("payload").notNull(),
  sources: json("sources"),
  isDemo: boolean("isDemo").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type SearchSnapshot = typeof searchSnapshots.$inferSelect;

// Google Trends / social trend signals
export const trendSignals = mysqlTable("trend_signals", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  region: varchar("region", { length: 16 }).notNull(),
  source: varchar("source", { length: 32 }).notNull(),
  momentumScore: float("momentumScore").default(0).notNull(),
  momentumLabel: varchar("momentumLabel", { length: 16 }),
  changePercent90d: float("changePercent90d"),
  interestOverTime: json("interestOverTime"),
  relatedQueries: json("relatedQueries"),
  risingQueries: json("risingQueries"),
  raw: json("raw"),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type TrendSignalRow = typeof trendSignals.$inferSelect;

// Meta Ad Library snapshots
export const adLibrarySnapshots = mysqlTable("ad_library_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  region: varchar("region", { length: 16 }).notNull(),
  activeAdCount: int("activeAdCount").default(0).notNull(),
  advertiserCount: int("advertiserCount").default(0).notNull(),
  creatives: json("creatives").notNull(),
  gaps: json("gaps"),
  raw: json("raw"),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type AdLibrarySnapshotRow = typeof adLibrarySnapshots.$inferSelect;

// TikTok Ads Library snapshots
export const tiktokAdsSnapshots = mysqlTable("tiktok_ads_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  region: varchar("region", { length: 16 }).notNull(),
  activeAdCount: int("activeAdCount").default(0).notNull(),
  advertiserCount: int("advertiserCount").default(0).notNull(),
  creatives: json("creatives").notNull(),
  gaps: json("gaps"),
  source: varchar("source", { length: 32 }).default("cached").notNull(),
  raw: json("raw"),
  fetchedAt: timestamp("fetchedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type TikTokAdsSnapshotRow = typeof tiktokAdsSnapshots.$inferSelect;

// Daily ingest job runs
export const ingestRuns = mysqlTable("ingest_runs", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", ["running", "completed", "failed"]).notNull(),
  apiCounts: json("apiCounts"),
  errors: json("errors"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type IngestRun = typeof ingestRuns.$inferSelect;

// Daily API usage caps (platform-wide)
export const apiUsageDaily = mysqlTable("api_usage_daily", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull(),
  usageDate: varchar("usageDate", { length: 10 }).notNull(),
  callCount: int("callCount").default(0).notNull(),
});

export type ApiUsageDaily = typeof apiUsageDaily.$inferSelect;

// User live-credit wallet
export const userCredits = mysqlTable("user_credits", {
  userId: int("userId").primaryKey(),
  balance: int("balance").default(0).notNull(),
  /** Top-ups and admin grants — preserved across monthly allowance resets */
  purchasedBalance: int("purchasedBalance").default(0).notNull(),
  monthlyAllowance: int("monthlyAllowance").default(0).notNull(),
  resetAt: timestamp("resetAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserCredits = typeof userCredits.$inferSelect;

export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", [
    "monthly_grant",
    "purchase",
    "spend",
    "admin_grant",
    "refund",
  ]).notNull(),
  action: varchar("action", { length: 64 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// AI output cache
export const aiOutputCache = mysqlTable("ai_output_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 128 }).notNull().unique(),
  feature: varchar("feature", { length: 64 }).notNull(),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type AiOutputCache = typeof aiOutputCache.$inferSelect;

// User-saved social media kits
export const savedSocialKits = mysqlTable("saved_social_kits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  productTitle: varchar("productTitle", { length: 255 }).notNull(),
  productBenefit: text("productBenefit"),
  region: varchar("region", { length: 16 }),
  productId: varchar("productId", { length: 128 }),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedSocialKitRow = typeof savedSocialKits.$inferSelect;
export type InsertSavedSocialKit = typeof savedSocialKits.$inferInsert;

// User keyword watches for rising-trend alerts
export const intelKeywordWatches = mysqlTable("intel_keyword_watches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  region: varchar("region", { length: 16 }).notNull(),
  lastMomentumLabel: varchar("lastMomentumLabel", { length: 16 }),
  alertOnRising: boolean("alertOnRising").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IntelKeywordWatch = typeof intelKeywordWatches.$inferSelect;
export type InsertIntelKeywordWatch = typeof intelKeywordWatches.$inferInsert;

// Email digest preferences for rising keywords
export const intelDigestPrefs = mysqlTable("intel_digest_prefs", {
  userId: int("userId").primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  region: varchar("region", { length: 16 }).default("US").notNull(),
  category: varchar("category", { length: 64 }),
  lastSentAt: timestamp("lastSentAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntelDigestPrefs = typeof intelDigestPrefs.$inferSelect;
