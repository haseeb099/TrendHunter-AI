import type { RegionCode } from "./searchTypes";

export type SocialCalendarDay = {
  day: number;
  platform: string;
  topic: string;
  format: string;
};

export type SocialSeoBlock = {
  title: string;
  metaDescription: string;
  bulletPoints: string[];
};

/** All generated social content for one product brief */
export type SocialKitPayload = {
  hashtags?: string[];
  copies?: string[];
  hooks?: string[];
  days?: SocialCalendarDay[];
  seo?: SocialSeoBlock;
  tiktokCaption?: string;
  instagramCaption?: string;
  generatedAt?: string;
};

export type SavedSocialKitSummary = {
  id: number;
  name: string;
  productTitle: string;
  productBenefit: string | null;
  region: RegionCode | null;
  productId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedSocialKit = SavedSocialKitSummary & {
  payload: SocialKitPayload;
};
