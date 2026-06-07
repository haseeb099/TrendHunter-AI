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
