import type { FeatureId } from "@shared/plans";
import { TRPCError } from "@trpc/server";
import { getPlatformSettings } from "../planCatalog";
import {
  assertAccountUsable,
  assertAiQuota,
  assertFeatureAccess,
  assertPipelineQuota,
  assertSearchQuota,
  assertWatchlistQuota,
} from "../plans";
import { authenticatedProcedure, getCtxUser, t } from "./trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import type { User } from "../../drizzle/schema";

const requireActiveAccount = t.middleware(async ({ ctx, next }) => {
  const user = ctx.user;
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  assertAccountUsable(user);
  return next({ ctx });
});

export const protectedBase = authenticatedProcedure.use(requireActiveAccount);

export function featureProcedure(feature: FeatureId) {
  return protectedBase.use(async (opts) => {
    await assertFeatureAccess(getCtxUser(opts.ctx), feature);
    return opts.next(opts);
  });
}

export function searchProcedure() {
  return protectedBase.use(async (opts) => {
    const user = getCtxUser(opts.ctx) as User;
    await assertFeatureAccess(user, "discover");
    await assertSearchQuota(user);
    return opts.next(opts);
  });
}

export function aiProcedure(feature: FeatureId) {
  return protectedBase.use(async (opts) => {
    const user = getCtxUser(opts.ctx) as User;
    const settings = await getPlatformSettings();
    if (settings.ai_features_enabled === false && user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AI features are temporarily disabled. Contact support.",
      });
    }
    await assertFeatureAccess(user, feature);
    await assertAiQuota(user);
    return opts.next(opts);
  });
}

export function pipelineCreateProcedure() {
  return protectedBase.use(async (opts) => {
    const user = getCtxUser(opts.ctx) as User;
    await assertFeatureAccess(user, "pipeline");
    await assertPipelineQuota(user);
    return opts.next(opts);
  });
}

export function watchlistAddProcedure() {
  return protectedBase.use(async (opts) => {
    const user = getCtxUser(opts.ctx) as User;
    await assertFeatureAccess(user, "watchlist");
    await assertWatchlistQuota(user);
    return opts.next(opts);
  });
}
