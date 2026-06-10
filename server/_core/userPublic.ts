import type { User } from "../../drizzle/schema";
import type { SubscriptionInfo } from "@shared/plans";

/** User fields safe to expose to the client — never includes passwordHash or billing internals. */
export type PublicUser = Omit<
  User,
  "passwordHash" | "stripeCustomerId" | "stripeSubscriptionId" | "adminNotes" | "limitOverrides"
>;

export type AuthUser = PublicUser & {
  subscription?: SubscriptionInfo;
};

export function toPublicUser(user: User): PublicUser {
  const {
    passwordHash: _passwordHash,
    stripeCustomerId: _stripeCustomerId,
    stripeSubscriptionId: _stripeSubscriptionId,
    adminNotes: _adminNotes,
    limitOverrides: _limitOverrides,
    ...publicUser
  } = user;
  return publicUser;
}

export function toAdminUserSummary(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    planId: user.planId,
    planStatus: user.planStatus,
    accountStatus: user.accountStatus,
    flagReason: user.flagReason,
    adminNotes: user.adminNotes,
    limitOverrides: user.limitOverrides,
    pausedUntil: user.pausedUntil,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    hasUsedTrial: user.hasUsedTrial,
    lastSignedIn: user.lastSignedIn,
    createdAt: user.createdAt,
  };
}
