import { eq, desc, and, sql, gt, isNull, lt, like, or, gte } from "drizzle-orm";
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
  adminAuditLog,
  coupons,
  couponRedemptions,
  stripeWebhookEvents,
} from "../drizzle/schema";
import type { AccountStatus, LimitOverrides } from "@shared/adminTypes";
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

export async function chatSessionBelongsToUser(sessionId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function deleteChatSession(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const owned = await chatSessionBelongsToUser(id, userId);
  if (!owned) return;
  await db.delete(chatMessages).where(and(eq(chatMessages.sessionId, id), eq(chatMessages.userId, userId)));
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
  const owned = await chatSessionBelongsToUser(msg.sessionId, msg.userId);
  if (!owned) return;
  await db.insert(chatMessages).values(msg);
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(and(eq(chatSessions.id, msg.sessionId), eq(chatSessions.userId, msg.userId)));
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

const SUPPLIER_MUTABLE_FIELDS = [
  "name",
  "country",
  "platform",
  "shippingDaysMin",
  "shippingDaysMax",
  "moq",
  "reliabilityScore",
  "communicationScore",
  "qualityScore",
  "profileUrl",
  "notes",
  "sampleOrdered",
  "sampleStatus",
  "sampleOrderDate",
] as const satisfies readonly (keyof InsertSupplier)[];

export async function updateSupplier(id: number, userId: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) return;
  const safe: Partial<InsertSupplier> = {};
  for (const key of SUPPLIER_MUTABLE_FIELDS) {
    if (key in data && data[key] !== undefined) {
      (safe as Record<string, unknown>)[key] = data[key];
    }
  }
  if (Object.keys(safe).length === 0) return;
  await db.update(suppliers).set(safe).where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
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

export async function countUserEventsSince(
  userId: number,
  eventType: string,
  since: Date
) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.userId, userId),
        eq(userEvents.eventType, eventType),
        gt(userEvents.createdAt, since)
      )
    );
  return Number(result[0]?.count ?? 0);
}

export async function countPipelineItems(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pipelineItems)
    .where(eq(pipelineItems.userId, userId));
  return Number(result[0]?.count ?? 0);
}

export async function countWatchlistItems(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, userId));
  return Number(result[0]?.count ?? 0);
}

export async function updateUserSubscription(
  userId: number,
  data: Partial<{
    planId: "trial" | "starter" | "pro" | "business" | "agency";
    planStatus: "active" | "expired" | "cancelled";
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    planStartedAt: Date | null;
    planExpiresAt: Date | null;
    hasUsedTrial: boolean;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function listUsersForAdmin(options: {
  search?: string;
  accountStatus?: AccountStatus;
  planId?: string;
  role?: "user" | "admin";
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  const page = options.page ?? 1;
  const pageSize = Math.min(options.pageSize ?? 25, 100);
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(like(users.email, term), like(users.name, term)));
  }
  if (options.accountStatus) {
    conditions.push(eq(users.accountStatus, options.accountStatus));
  }
  if (options.planId) {
    conditions.push(
      eq(users.planId, options.planId as "trial" | "starter" | "pro" | "business" | "agency")
    );
  }
  if (options.role) {
    conditions.push(eq(users.role, options.role));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const monthStart = startOfMonth();

  const rows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.lastSignedIn))
    .limit(pageSize)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(whereClause);
  const total = Number(countResult[0]?.count ?? 0);

  const enriched = await Promise.all(
    rows.map(async (user) => {
      const [searchesThisMonth, pipelineCount, watchlistCount] = await Promise.all([
        countUserEventsSince(user.id, "search_query", monthStart),
        countPipelineItems(user.id),
        countWatchlistItems(user.id),
      ]);
      const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
      const isTrial =
        user.planId === "trial" && trialEndsAt !== null && trialEndsAt > new Date();
      const daysLeftInTrial =
        isTrial && trialEndsAt
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
          : null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        planId: user.planId,
        planStatus: user.planStatus,
        accountStatus: user.accountStatus as AccountStatus,
        flagReason: user.flagReason,
        isTrial,
        trialEndsAt,
        daysLeftInTrial,
        lastSignedIn: user.lastSignedIn,
        createdAt: user.createdAt,
        searchesThisMonth,
        pipelineCount,
        watchlistCount,
      };
    })
  );

  return { users: enriched, total, page, pageSize };
}

export async function getAdminOverviewStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      flaggedUsers: 0,
      pausedUsers: 0,
      deactivatedUsers: 0,
      trialUsers: 0,
      paidUsers: 0,
      adminUsers: 0,
      searchesToday: 0,
      aiCallsToday: 0,
      newSignupsToday: 0,
      activeUsers7d: 0,
    };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [
    totalRow,
    activeRow,
    flaggedRow,
    pausedRow,
    deactivatedRow,
    trialRow,
    paidRow,
    adminRow,
    searchesRow,
    aiRow,
    signupsRow,
    active7dRow,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountStatus, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountStatus, "flagged")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountStatus, "paused")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountStatus, "deactivated")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.planId, "trial")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.planId} != 'trial'`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "admin")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userEvents)
      .where(
        and(eq(userEvents.eventType, "search_query"), gte(userEvents.createdAt, todayStart))
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userEvents)
      .where(and(eq(userEvents.eventType, "ai_call"), gte(userEvents.createdAt, todayStart))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, todayStart)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.lastSignedIn, weekAgo)),
  ]);

  return {
    totalUsers: Number(totalRow[0]?.count ?? 0),
    activeUsers: Number(activeRow[0]?.count ?? 0),
    flaggedUsers: Number(flaggedRow[0]?.count ?? 0),
    pausedUsers: Number(pausedRow[0]?.count ?? 0),
    deactivatedUsers: Number(deactivatedRow[0]?.count ?? 0),
    trialUsers: Number(trialRow[0]?.count ?? 0),
    paidUsers: Number(paidRow[0]?.count ?? 0),
    adminUsers: Number(adminRow[0]?.count ?? 0),
    searchesToday: Number(searchesRow[0]?.count ?? 0),
    aiCallsToday: Number(aiRow[0]?.count ?? 0),
    newSignupsToday: Number(signupsRow[0]?.count ?? 0),
    activeUsers7d: Number(active7dRow[0]?.count ?? 0),
  };
}

export async function getPlatformAnalytics() {
  const db = await getDb();
  if (!db) {
    return {
      planDistribution: [],
      signupsByDay: [],
      searchesToday: 0,
      aiCallsToday: 0,
      newSignupsToday: 0,
      activeUsers7d: 0,
      paidUsers: 0,
      totalCoupons: 0,
      totalRedemptions: 0,
    };
  }

  const overview = await getAdminOverviewStats();
  const planRows = await db
    .select({ planId: users.planId, count: sql<number>`count(*)` })
    .from(users)
    .groupBy(users.planId);

  const signupsByDay: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const row = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(gte(users.createdAt, day), lt(users.createdAt, next)));
    signupsByDay.push({
      date: day.toISOString().slice(0, 10),
      count: Number(row[0]?.count ?? 0),
    });
  }

  const [couponRow, redemptionRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(coupons),
    db.select({ count: sql<number>`count(*)` }).from(couponRedemptions),
  ]);

  return {
    planDistribution: planRows.map((r) => ({
      planId: r.planId,
      count: Number(r.count),
    })),
    signupsByDay,
    searchesToday: overview.searchesToday,
    aiCallsToday: overview.aiCallsToday,
    newSignupsToday: overview.newSignupsToday,
    activeUsers7d: overview.activeUsers7d,
    paidUsers: overview.paidUsers,
    totalCoupons: Number(couponRow[0]?.count ?? 0),
    totalRedemptions: Number(redemptionRow[0]?.count ?? 0),
  };
}

export async function getGlobalAuditLog(page = 1, pageSize = 30) {
  const db = await getDb();
  if (!db) return { entries: [], total: 0 };

  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: adminAuditLog.id,
      adminUserId: adminAuditLog.adminUserId,
      targetUserId: adminAuditLog.targetUserId,
      action: adminAuditLog.action,
      details: adminAuditLog.details,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countRow = await db.select({ count: sql<number>`count(*)` }).from(adminAuditLog);
  const total = Number(countRow[0]?.count ?? 0);

  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [admin, target] = await Promise.all([
        db.select({ email: users.email }).from(users).where(eq(users.id, r.adminUserId)).limit(1),
        db.select({ email: users.email }).from(users).where(eq(users.id, r.targetUserId)).limit(1),
      ]);
      return {
        id: r.id,
        adminUserId: r.adminUserId,
        adminEmail: admin[0]?.email ?? null,
        targetUserId: r.targetUserId,
        targetEmail: target[0]?.email ?? null,
        action: r.action,
        details: r.details as Record<string, unknown> | null,
        createdAt: r.createdAt,
      };
    })
  );

  return { entries: enriched, total, page, pageSize };
}

export async function getCouponRedemptionsList(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: couponRedemptions.id,
      couponId: couponRedemptions.couponId,
      userId: couponRedemptions.userId,
      redeemedAt: couponRedemptions.redeemedAt,
      code: coupons.code,
      couponType: coupons.couponType,
      userEmail: users.email,
    })
    .from(couponRedemptions)
    .innerJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
    .leftJoin(users, eq(couponRedemptions.userId, users.id))
    .orderBy(desc(couponRedemptions.redeemedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    couponCode: r.code,
    couponType: r.couponType,
    userId: r.userId,
    userEmail: r.userEmail,
    redeemedAt: r.redeemedAt,
  }));
}

export async function getUserActivitySummary(userId: number) {
  const monthStart = startOfMonth();
  const [searches, aiCalls, pipeline, watchlist, couponsUsed] = await Promise.all([
    countUserEventsSince(userId, "search_query", monthStart),
    countUserEventsSince(userId, "ai_call", monthStart),
    countPipelineItems(userId),
    countWatchlistItems(userId),
    getUserCouponRedemptions(userId),
  ]);
  return { searches, aiCalls, pipeline, watchlist, couponsUsed };
}

export async function getUserCouponRedemptions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: couponRedemptions.id,
      code: coupons.code,
      couponType: coupons.couponType,
      redeemedAt: couponRedemptions.redeemedAt,
    })
    .from(couponRedemptions)
    .innerJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
    .where(eq(couponRedemptions.userId, userId))
    .orderBy(desc(couponRedemptions.redeemedAt));

  return rows;
}

export async function exportUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      planId: users.planId,
      planStatus: users.planStatus,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return rows;
}

export async function getUserSearchHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const liveEvents = await db
    .select()
    .from(userEvents)
    .where(and(eq(userEvents.userId, userId), eq(userEvents.eventType, "search_query")))
    .orderBy(desc(userEvents.createdAt))
    .limit(limit);

  const saved = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt))
    .limit(limit);

  const live = liveEvents.map((e) => {
    const meta = (e.metadata ?? {}) as { query?: string; platform?: string };
    return {
      id: e.id,
      query: meta.query ?? "—",
      platform: meta.platform,
      createdAt: e.createdAt,
      source: "live" as const,
    };
  });

  const savedMapped = saved.map((s) => ({
    id: s.id + 1_000_000,
    query: s.query,
    platform: undefined,
    createdAt: s.createdAt,
    source: "saved" as const,
  }));

  return [...live, ...savedMapped]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function logAdminAction(
  adminUserId: number,
  targetUserId: number,
  action: string,
  details?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditLog).values({
    adminUserId,
    targetUserId,
    action,
    details: details ?? null,
  });
}

export async function getAdminAuditForUser(targetUserId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: adminAuditLog.id,
      adminUserId: adminAuditLog.adminUserId,
      targetUserId: adminAuditLog.targetUserId,
      action: adminAuditLog.action,
      details: adminAuditLog.details,
      createdAt: adminAuditLog.createdAt,
      adminEmail: users.email,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(adminAuditLog.adminUserId, users.id))
    .where(eq(adminAuditLog.targetUserId, targetUserId))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    adminUserId: r.adminUserId,
    adminEmail: r.adminEmail,
    targetUserId: r.targetUserId,
    action: r.action,
    details: r.details as Record<string, unknown> | null,
    createdAt: r.createdAt,
  }));
}

export async function updateUserProfile(
  userId: number,
  data: Partial<{ name: string; passwordHash: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserAdmin(
  userId: number,
  data: Partial<{
    name: string | null;
    email: string | null;
    passwordHash: string;
    accountStatus: AccountStatus;
    flagReason: string | null;
    adminNotes: string | null;
    limitOverrides: LimitOverrides | null;
    pausedUntil: Date | null;
    planId: "trial" | "starter" | "pro" | "business" | "agency";
    planStatus: "active" | "expired" | "cancelled";
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    planStartedAt: Date | null;
    planExpiresAt: Date | null;
    hasUsedTrial: boolean;
    role: "user" | "admin";
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function deleteUserCompletely(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(savedSearches).where(eq(savedSearches.userId, userId));
  await db.delete(savedFilterPresets).where(eq(savedFilterPresets.userId, userId));
  await db.delete(userEvents).where(eq(userEvents.userId, userId));
  await db.delete(watchlistItems).where(eq(watchlistItems.userId, userId));
  await db.delete(pipelineItems).where(eq(pipelineItems.userId, userId));
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  await db.delete(chatSessions).where(eq(chatSessions.userId, userId));
  await db.delete(profitCalculations).where(eq(profitCalculations.userId, userId));
  await db.delete(suppliers).where(eq(suppliers.userId, userId));
  await db.delete(adminAuditLog).where(eq(adminAuditLog.targetUserId, userId));
  await db.delete(couponRedemptions).where(eq(couponRedemptions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function isStripeWebhookProcessed(eventId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: stripeWebhookEvents.id })
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.eventId, eventId))
    .limit(1);
  return rows.length > 0;
}

export async function markStripeWebhookProcessed(
  eventId: string,
  eventType: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(stripeWebhookEvents).values({ eventId, eventType });
}

/** Latest unredeemed-at-checkout Stripe promotion code for discount_percent coupons. */
export async function getActiveStripeDiscountForUser(
  userId: number
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({ promoId: couponRedemptions.stripePromotionCodeId })
    .from(couponRedemptions)
    .innerJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
    .where(
      and(
        eq(couponRedemptions.userId, userId),
        eq(coupons.couponType, "discount_percent")
      )
    )
    .orderBy(desc(couponRedemptions.redeemedAt))
    .limit(1);

  const promoId = rows[0]?.promoId;
  return promoId ?? null;
}
