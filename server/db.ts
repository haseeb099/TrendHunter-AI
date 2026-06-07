import { eq, desc, and } from "drizzle-orm";
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
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
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
