import type { PlanId } from "./plans";

/** Credit cost per live action */
export const CREDIT_COSTS = {
  live_search: 1,
  trends_live: 1,
  ad_library_live: 2,
  tiktok_ads_live: 2,
  competitor_live: 3,
  validate_live: 2,
  social_live: 1,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export const CREDIT_ACTION_LABELS: Record<CreditAction, string> = {
  live_search: "Live marketplace search",
  trends_live: "Live Google Trends refresh",
  ad_library_live: "Meta Ad Library scan",
  tiktok_ads_live: "TikTok Ad Library scan",
  competitor_live: "Live competitor report",
  validate_live: "Live validation refresh",
  social_live: "Live social kit refresh",
};

/** Monthly live-credit allowance bundled with each plan */
export const PLAN_LIVE_CREDITS: Record<PlanId, number> = {
  trial: 50,
  starter: 0,
  pro: 100,
  business: 400,
  agency: -1,
};

export function creditCost(action: CreditAction): number {
  return CREDIT_COSTS[action];
}

export function isUnlimitedCredits(limit: number): boolean {
  return limit < 0;
}

export type CreditPackId = "pack_50" | "pack_100" | "pack_250";

export type CreditPackDefinition = {
  id: CreditPackId;
  credits: number;
  label: string;
  priceLabel: string;
  description: string;
};

/** One-time Stripe credit top-up packs */
export const CREDIT_PACKS: Record<CreditPackId, CreditPackDefinition> = {
  pack_50: {
    id: "pack_50",
    credits: 50,
    label: "50 credits",
    priceLabel: "$9",
    description: "Light live refresh — ~25 trend scans or ~16 Meta ad scans",
  },
  pack_100: {
    id: "pack_100",
    credits: 100,
    label: "100 credits",
    priceLabel: "$15",
    description: "Best value for weekly live research sessions",
  },
  pack_250: {
    id: "pack_250",
    credits: 250,
    label: "250 credits",
    priceLabel: "$29",
    description: "Power pack for heavy validation and competitor runs",
  },
};

export const CREDIT_PACK_IDS = Object.keys(CREDIT_PACKS) as CreditPackId[];

export function getCreditPack(packId: string): CreditPackDefinition | null {
  return CREDIT_PACKS[packId as CreditPackId] ?? null;
}
