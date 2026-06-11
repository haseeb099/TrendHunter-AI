export type PlanId = "trial" | "starter" | "pro" | "business" | "agency";

export type PlanStatus = "active" | "expired" | "cancelled";

export const ALL_FEATURE_IDS = [
  "discover",
  "validate",
  "competitors",
  "marketgap",
  "profit",
  "suppliers",
  "supplier_offers",
  "social",
  "agent",
  "pipeline",
  "watchlist",
  "analytics",
  "filter_presets",
  "analytics_advanced",
] as const;

export type FeatureId =
  | "discover"
  | "validate"
  | "competitors"
  | "marketgap"
  | "profit"
  | "suppliers"
  | "supplier_offers"
  | "social"
  | "agent"
  | "pipeline"
  | "watchlist"
  | "analytics"
  | "filter_presets"
  | "analytics_advanced";

export type PlanLimits = {
  searchesPerMonth: number;
  pipelineItems: number;
  watchlistItems: number;
  aiCallsPerMonth: number;
  /** Live API credits per month (cached reads are free) */
  liveCreditsPerMonth: number;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceLabel: string;
  billingPeriod: string;
  highlight?: boolean;
  features: string[];
  featureIds: FeatureId[];
  limits: PlanLimits;
  sortOrder: number;
};

const STARTER_FEATURES: FeatureId[] = [
  "discover",
  "profit",
  "pipeline",
  "watchlist",
  "suppliers",
  "analytics",
];

const PRO_FEATURES: FeatureId[] = [
  ...STARTER_FEATURES,
  "validate",
  "competitors",
  "marketgap",
  "social",
  "agent",
  "supplier_offers",
  "filter_presets",
];

const BUSINESS_FEATURES: FeatureId[] = [...PRO_FEATURES, "analytics_advanced"];

const AGENCY_FEATURES: FeatureId[] = [...BUSINESS_FEATURES];

export const TRIAL_DAYS = 3;

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: "trial",
    name: "3-Day Trial",
    tagline: "Full Pro access — no card required",
    priceMonthly: 0,
    priceLabel: "Free",
    billingPeriod: "3 days",
    highlight: true,
    features: [
      "Full Pro feature access",
      "500 searches during trial",
      "AI validation & competitor spy",
      "Social kit & research agent",
    ],
    featureIds: PRO_FEATURES,
    limits: {
      searchesPerMonth: 500,
      pipelineItems: 100,
      watchlistItems: 200,
      aiCallsPerMonth: 200,
      liveCreditsPerMonth: 50,
    },
    sortOrder: 0,
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For solo sellers validating first niches",
    priceMonthly: 29,
    priceLabel: "$29",
    billingPeriod: "per month",
    features: [
      "Discover & trending feed",
      "100 searches / month",
      "Watchlist & profit calculator",
      "Pipeline (up to 15 products)",
      "Manual supplier contacts",
    ],
    featureIds: STARTER_FEATURES,
    limits: {
      searchesPerMonth: 100,
      pipelineItems: 15,
      watchlistItems: 50,
      aiCallsPerMonth: 0,
      liveCreditsPerMonth: 0,
    },
    sortOrder: 1,
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For operators scaling across channels",
    priceMonthly: 79,
    priceLabel: "$79",
    billingPeriod: "per month",
    highlight: true,
    features: [
      "Everything in Starter",
      "AI validation & scoring",
      "Competitor intelligence",
      "Market gap finder",
      "Social kit & AI agent",
      "500 searches / month",
      "Live supplier offers",
    ],
    featureIds: PRO_FEATURES,
    limits: {
      searchesPerMonth: 500,
      pipelineItems: 100,
      watchlistItems: 200,
      aiCallsPerMonth: 300,
      liveCreditsPerMonth: 100,
    },
    sortOrder: 2,
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "For growing brands with higher volume",
    priceMonthly: 149,
    priceLabel: "$149",
    billingPeriod: "per month",
    features: [
      "Everything in Pro",
      "2,000 searches / month",
      "500 pipeline products",
      "Advanced analytics",
      "Priority support",
    ],
    featureIds: BUSINESS_FEATURES,
    limits: {
      searchesPerMonth: 2000,
      pipelineItems: 500,
      watchlistItems: 1000,
      aiCallsPerMonth: 1000,
      liveCreditsPerMonth: 400,
    },
    sortOrder: 3,
  },
  agency: {
    id: "agency",
    name: "Agency",
    tagline: "For teams managing multiple brands",
    priceMonthly: 199,
    priceLabel: "$199",
    billingPeriod: "per month",
    features: [
      "Everything in Business",
      "Unlimited searches & live credits",
      "Unlimited pipeline & watchlist",
      "Dedicated onboarding support",
      "Custom usage reporting",
    ],
    featureIds: AGENCY_FEATURES,
    limits: {
      searchesPerMonth: -1,
      pipelineItems: -1,
      watchlistItems: -1,
      aiCallsPerMonth: -1,
      liveCreditsPerMonth: -1,
    },
    sortOrder: 4,
  },
};

export const PUBLIC_PLANS: PlanDefinition[] = Object.values(PLAN_DEFINITIONS).sort(
  (a, b) => a.sortOrder - b.sortOrder
);

export const PAID_PLAN_IDS: PlanId[] = ["starter", "pro", "business", "agency"];

/** Plans available for self-serve Stripe checkout (Agency is contact/waitlist only). */
export const SELF_SERVE_CHECKOUT_PLAN_IDS: PlanId[] = ["starter", "pro", "business"];

export const PLAN_RANK: Record<PlanId, number> = {
  trial: 2,
  starter: 1,
  pro: 2,
  business: 3,
  agency: 4,
};

export type DashboardTabId =
  | "search"
  | "intel"
  | "trendpulse"
  | "adradar"
  | "tiktokradar"
  | "validate"
  | "competitors"
  | "profit"
  | "suppliers"
  | "social"
  | "marketgap"
  | "analytics"
  | "agent"
  | "pipeline"
  | "watchlist"
  | "billing"
  | "account";

/** Tabs always available regardless of plan (SaaS account management) */
export const ALWAYS_ACCESSIBLE_TABS: DashboardTabId[] = ["billing", "account"];

export const TAB_REQUIRED_FEATURE: Record<
  Exclude<DashboardTabId, "billing" | "account">,
  FeatureId
> = {
  search: "discover",
  intel: "discover",
  trendpulse: "discover",
  adradar: "discover",
  tiktokradar: "discover",
  validate: "validate",
  competitors: "competitors",
  marketgap: "marketgap",
  profit: "profit",
  suppliers: "suppliers",
  social: "social",
  agent: "agent",
  pipeline: "pipeline",
  watchlist: "watchlist",
  analytics: "analytics",
};

export type SubscriptionInfo = {
  planId: PlanId;
  effectivePlanId: PlanId;
  planStatus: PlanStatus;
  displayName: string;
  isTrial: boolean;
  isActive: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number | null;
  planExpiresAt: Date | null;
  features: FeatureId[];
  limits: PlanLimits;
  usage: {
    searchesThisMonth: number;
    aiCallsThisMonth: number;
    pipelineItems: number;
    watchlistItems: number;
    creditsUsedThisMonth: number;
  };
  credits: {
    balance: number;
    monthlyAllowance: number;
    remaining: number | null;
  };
  canStartTrial: boolean;
  /** True when user has a Stripe customer record (portal available even if sub inactive) */
  hasStripeCustomer?: boolean;
};

export function planHasFeature(
  planId: PlanId,
  feature: FeatureId,
  catalog: Record<PlanId, PlanDefinition> = PLAN_DEFINITIONS
): boolean {
  return catalog[planId]?.featureIds.includes(feature) ?? false;
}

/** Lowest paid tier that includes a feature (for upgrade messaging). */
export function minimumPlanForFeature(
  feature: FeatureId,
  catalog: Record<PlanId, PlanDefinition> = PLAN_DEFINITIONS
): PlanId {
  const order: PlanId[] = ["starter", "pro", "business", "agency"];
  for (const planId of order) {
    if (planHasFeature(planId, feature, catalog)) return planId;
  }
  return "agency";
}

export function getPlanFromCatalog(
  planId: PlanId,
  catalog: Record<PlanId, PlanDefinition> = PLAN_DEFINITIONS
): PlanDefinition {
  return catalog[planId] ?? PLAN_DEFINITIONS[planId];
}

export function formatPriceLabel(amount: number): string {
  if (amount <= 0) return "Free";
  return `$${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export function formatPlanDisplayName(
  planId: PlanId,
  isTrial: boolean,
  catalog: Record<PlanId, PlanDefinition> = PLAN_DEFINITIONS
): string {
  if (isTrial) return `${catalog.pro.name} (Trial)`;
  return getPlanFromCatalog(planId, catalog).name;
}
