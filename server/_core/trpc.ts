import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import type { User } from "../../drizzle/schema";
import { assertAccountUsable } from "../plans";
import { getPlatformSettings } from "../planCatalog";

export type AuthedContext = TrpcContext & { user: User };

export function getCtxUser(ctx: TrpcContext): User {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return ctx.user;
}

export const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const user = ctx.user;
  return next({
    ctx: { ...ctx, user } as AuthedContext,
  });
});

/** Logged in only — billing/support when account is paused */
export const authenticatedProcedure = t.procedure.use(requireUser);

/** Logged in + account must be active (not paused/deactivated) */
export const protectedProcedure = authenticatedProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    const user = ctx.user;
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (user.role !== "admin") {
      const settings = await getPlatformSettings();
      if (settings.maintenance_mode) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            String(settings.maintenance_message ?? "") ||
            "Platform is under maintenance. Please try again later.",
        });
      }
    }

    assertAccountUsable(user);
    return next({ ctx: { ...ctx, user } as AuthedContext });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
