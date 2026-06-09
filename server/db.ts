import { eq, desc, and, sql, gt, isNull, lt, like } from "drizzle-orm";
import type { ProductOffer, ShipFromCode } from "@shared/searchTypes";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  savedSearches,
  watchlistItems,
  InsertWatchlistItem,
  pipelineItems,
  InsertPipelineItem,
  chatSessions,
  chatMessages,
  InsertChatMessage,
  profitCalculations,
  InsertProfitCalculation,
  suppliers,
  InsertSupplier,
  trendingSnapshots,
  productOffers,
  savedFilterPresets,
  userEvents,
} from "../drizzle/schema";
import type { ProductHuntFilters } from "@shared/searchTypes";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function countUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(result[0]?.count ?? 0);
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values(user);
  return getUserByOpenId(user.openId);
}

export async function touchUserLastSignedIn(openId: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.openId, openId));
}

// Saved Searches
export async function getSavedSearches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.createdAt));
}

export async function createSavedSearch(userId: number, query: string, filters?: unknown) {
  const db = await getDb();
  if (!db) return;
  await db.insert(savedSearches).values({ userId, query, filters: filters ?? null });
}

export async function deleteSavedSearch(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
}

// Watchlist
export async function getWatchlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlistItems).where(eq(watchlistItems.userId, userId)).orderBy(desc(watchlistItems.createdAt));
}

export async function addToWatchlist(item: InsertWatchlistItem) {
  const db = await getDb();
  if (!db) return;
  await db.insert(watchlistItems).values(item);
}

export async function removeFromWatchlist(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(watchlistItems).where(and(eq(watchlistItems.id, id), eq(watchlistItems.userId, userId)));
}

// Pipeline
export async function getPipelineItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineItems).where(eq(pipelineItems.userId, userId)).orderBy(desc(pipelineItems.createdAt));
}

export async function createPipelineItem(item: InsertPipelineItem) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pipelineItems).values(item);
}

export async function updatePipelineItem(id: number, userId: number, data: Partial<InsertPipelineItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(pipelineItems).set(data).where(and(eq(pipelineItems.id, id), eq(pipelineItems.userId, userId)));
}

export async function deletePipelineItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pipelineItems).where(and(eq(pipelineItems.id, id), eq(pipelineItems.userId, userId)));
}

// Chat Sessions
export async function getChatSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.updatedAt));
}

export async function createChatSession(userId: number, title?: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(chatSessions).values({ userId, title: title ?? "New Chat" });
  const rows = await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function deleteChatSession(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
  await db.delete(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)));
}

export async function getChatMessages(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, userId))).orderBy(chatMessages.createdAt);
}

export async function addChatMessage(msg: InsertChatMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(msg);
  // Update session updatedAt
  await db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, msg.sessionId));
}

// Profit Calculations
export async function getProfitCalculations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profitCalculations).where(eq(profitCalculations.userId, userId)).orderBy(desc(profitCalculations.createdAt));
}

export async function saveProfitCalculation(calc: InsertProfitCalculation) {
  const db = await getDb();
  if (!db) return;
  await db.insert(profitCalculations).values(calc);
}

export async function deleteProfitCalculation(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(profitCalculations).where(and(eq(profitCalculations.id, id), eq(profitCalculations.userId, userId)));
}

// Suppliers
export async function getSuppliers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.userId, userId)).orderBy(desc(suppliers.createdAt));
}

export async function createSupplier(supplier: InsertSupplier) {
  const db = await getDb();
  if (!db) return;
  await db.insert(suppliers).values(supplier);
}

export async function updateSupplier(id: number, userId: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) return;
  await db.update(suppliers).set(data).where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
}

export async function deleteSupplier(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
}

// Trending snapshots
export async function getValidTrendingSnapshot(region: string, category?: string) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const conditions = [
    eq(trendingSnapshots.region, region),
    gt(trendingSnapshots.expiresAt, now),
  ];

  if (category) {
    conditions.push(eq(trendingSnapshots.category, category));
  } else {
    conditions.push(isNull(trendingSnapshots.category));
  }

  const rows = await db
    .select()
    .from(trendingSnapshots)
    .where(and(...conditions))
    .orderBy(desc(trendingSnapshots.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function upsertTrendingSnapshot(data: {
  region: string;
  category: string | null;
  payload: unknown;
  sources: unknown;
  isDemo: boolean;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return;

  await pruneExpiredTrendingSnapshots();

  await db.insert(trendingSnapshots).values({
    region: data.region,
    category: data.category,
    payload: data.payload,
    sources: data.sources,
    isDemo: data.isDemo,
    expiresAt: data.expiresAt,
  });
}

export async function pruneExpiredTrendingSnapshots() {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.delete(trendingSnapshots).where(lt(trendingSnapshots.expiresAt, now));
}

export async function countTrendingSnapshots() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(trendingSnapshots);
  return Number(result[0]?.count ?? 0);
}

export async function countValidTrendingSnapshots() {
  const db = await getDb();
  if (!db) return 0;
  const now = new Date();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(trendingSnapshots)
    .where(gt(trendingSnapshots.expiresAt, now));
  return Number(result[0]?.count ?? 0);
}

// Product offers cache
function rowToProductOffer(row: typeof productOffers.$inferSelect): ProductOffer {
  const raw = (row.raw ?? {}) as Partial<ProductOffer>;
  return {
    id: raw.id ?? `cached-${row.id}`,
    productId: row.productId ?? undefined,
    productTitle: row.productTitle,
    supplierPlatform: row.supplierPlatform,
    supplierSku: row.supplierSku ?? undefined,
    warehouse: row.warehouse ?? undefined,
    shipFrom: (row.shipFrom ?? "CN") as ShipFromCode,
    unitCost: row.unitCost,
    shippingCost: row.shippingCost,
    moq: row.moq ?? 1,
    processingDays: row.processingDays ?? undefined,
    shippingDaysMin: row.shippingDaysMin ?? undefined,
    shippingDaysMax: row.shippingDaysMax ?? undefined,
    currency: row.currency ?? "USD",
    landedCost: row.unitCost + row.shippingCost,
    isDemo: raw.isDemo,
  };
}

export async function getCachedProductOffers(options: {
  productId?: string;
  title: string;
  maxAgeMs: number;
}): Promise<ProductOffer[]> {
  const db = await getDb();
  if (!db) return [];

  const minFetchedAt = new Date(Date.now() - options.maxAgeMs);
  const titlePattern = `%${options.title.slice(0, 40)}%`;

  let rows = options.productId
    ? await db
        .select()
        .from(productOffers)
        .where(
          and(
            gt(productOffers.fetchedAt, minFetchedAt),
            eq(productOffers.productId, options.productId)
          )
        )
        .orderBy(desc(productOffers.fetchedAt))
        .limit(20)
    : [];

  if (rows.length === 0) {
    rows = await db
      .select()
      .from(productOffers)
      .where(
        and(gt(productOffers.fetchedAt, minFetchedAt), like(productOffers.productTitle, titlePattern))
      )
      .orderBy(desc(productOffers.fetchedAt))
      .limit(20);
  }

  const seen = new Set<string>();
  const offers: ProductOffer[] = [];
  for (const row of rows) {
    const key = `${row.supplierPlatform}-${row.supplierSku ?? row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    offers.push(rowToProductOffer(row));
  }
  return offers;
}

export async function cacheProductOffers(
  offers: Array<{
    productId: string | null;
    productTitle: string;
    supplierPlatform: "cj" | "aliexpress" | "manual";
    supplierSku: string | null;
    warehouse: string | null;
    shipFrom: string;
    unitCost: number;
    shippingCost: number;
    moq: number | null;
    processingDays: number | null;
    shippingDaysMin: number | null;
    shippingDaysMax: number | null;
    currency: string;
    raw: unknown;
  }>
) {
  const db = await getDb();
  if (!db || offers.length === 0) return;

  await db.insert(productOffers).values(
    offers.map((o) => ({
      productId: o.productId,
      productTitle: o.productTitle,
      supplierPlatform: o.supplierPlatform,
      supplierSku: o.supplierSku,
      warehouse: o.warehouse,
      shipFrom: o.shipFrom,
      unitCost: o.unitCost,
      shippingCost: o.shippingCost,
      moq: o.moq ?? 1,
      processingDays: o.processingDays,
      shippingDaysMin: o.shippingDaysMin,
      shippingDaysMax: o.shippingDaysMax,
      currency: o.currency,
      raw: o.raw,
    }))
  );
}

// Saved filter presets
export async function getFilterPresets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savedFilterPresets)
    .where(eq(savedFilterPresets.userId, userId))
    .orderBy(desc(savedFilterPresets.createdAt));
}

export async function saveFilterPreset(
  userId: number,
  name: string,
  filters: ProductHuntFilters
) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(savedFilterPresets).values({ userId, name, filters });
  const rows = await db
    .select()
    .from(savedFilterPresets)
    .where(eq(savedFilterPresets.userId, userId))
    .orderBy(desc(savedFilterPresets.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteFilterPreset(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(savedFilterPresets)
    .where(and(eq(savedFilterPresets.id, id), eq(savedFilterPresets.userId, userId)));
}

// User activity events
export async function recordUserEvent(
  userId: number,
  eventType: string,
  metadata?: unknown
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userEvents).values({
    userId,
    eventType,
    metadata: metadata ?? null,
  });
}

export async function countUserEvents(userId: number, eventType: string) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userEvents)
    .where(and(eq(userEvents.userId, userId), eq(userEvents.eventType, eventType)));
  return Number(result[0]?.count ?? 0);
}
