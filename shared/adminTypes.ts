import type { PlanId } from "./plans";

export type AccountStatus = "active" | "deactivated" | "flagged" | "paused";

export type LimitOverrides = {
  searchesPerMonth?: number;
  aiCallsPerMonth?: number;
  pipelineItems?: number;
  watchlistItems?: number;
};

export type AdminUserSummary = {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  planId: PlanId;
  planStatus: string;
  accountStatus: AccountStatus;
  flagReason: string | null;
  isTrial: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number | null;
  lastSignedIn: Date;
  createdAt: Date;
  searchesThisMonth: number;
  pipelineCount: number;
  watchlistCount: number;
};

export type AdminSearchEvent = {
  id: number;
  query: string;
  platform?: string;
  createdAt: Date;
  source: "live" | "saved";
};

export type AdminAuditEntry = {
  id: number;
  adminUserId: number;
  adminEmail: string | null;
  targetUserId: number;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
};

export type CouponType =
  | "grant_plan"
  | "extend_trial"
  | "extend_subscription"
  | "bonus_searches"
  | "discount_percent";

export type AdminPlanConfig = {
  planId: PlanId;
  name: string;
  tagline: string | null;
  priceMonthly: number;
  priceLabel: string;
  billingPeriod: string;
  highlight: boolean;
  isActive: boolean;
  sortOrder: number;
  trialDays: number | null;
  features: string[];
  featureIds: string[];
  limits: {
    searchesPerMonth: number;
    pipelineItems: number;
    watchlistItems: number;
    aiCallsPerMonth: number;
  };
  updatedAt: Date;
};

export type AdminCoupon = {
  id: number;
  code: string;
  description: string | null;
  couponType: CouponType;
  value: number;
  grantPlanId: PlanId | null;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export type PlatformSettings = {
  trial_days: number;
  registration_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  announcement_banner: string;
  announcement_type: "info" | "warning" | "success";
  support_email: string;
  ai_features_enabled: boolean;
  self_serve_billing: boolean;
};

export type AdminPlatformAnalytics = {
  planDistribution: { planId: string; count: number }[];
  signupsByDay: { date: string; count: number }[];
  searchesToday: number;
  aiCallsToday: number;
  newSignupsToday: number;
  activeUsers7d: number;
  paidUsers: number;
  totalCoupons: number;
  totalRedemptions: number;
};

export type AdminGlobalAuditEntry = {
  id: number;
  adminUserId: number;
  adminEmail: string | null;
  targetUserId: number;
  targetEmail: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
};

export type AdminCouponRedemption = {
  id: number;
  couponCode: string;
  couponType: string;
  userId: number;
  userEmail: string | null;
  redeemedAt: Date;
};
