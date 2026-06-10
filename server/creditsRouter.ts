import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { getCtxUser } from "./_core/trpc";
import { getCreditWallet, grantCredits } from "./credits";
import { desc, eq } from "drizzle-orm";
import { creditTransactions } from "../drizzle/schema";
import { getDb } from "./db";
import { CREDIT_ACTION_LABELS, CREDIT_COSTS } from "@shared/credits";

export const creditsRouter = router({
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await getCreditWallet(getCtxUser(ctx));
    return wallet;
  }),

  getCosts: protectedProcedure.query(() => ({
    costs: CREDIT_COSTS,
    labels: CREDIT_ACTION_LABELS,
  })),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, getCtxUser(ctx).id))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(input.limit ?? 30);

      return rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        type: r.type,
        action: r.action,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

  adminGrant: adminProcedure
    .input(z.object({ userId: z.number(), amount: z.number().min(1).max(10000) }))
    .mutation(async ({ ctx, input }) => {
      await grantCredits(input.userId, input.amount, "admin_grant", {
        grantedBy: getCtxUser(ctx).id,
      });
      return { success: true };
    }),
});
