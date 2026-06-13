/** Default keywords warmed on startup / daily ingest and shown in Intel Center. */
export const INTEL_SEED_KEYWORDS = [
  "wireless earbuds",
  "portable blender",
  "led strip lights",
  "pet grooming kit",
  "skincare serum",
  "yoga mat",
  "phone case",
  "car phone mount",
  "desk organizer",
  "garden tools",
  "fashion jewelry",
  "massage gun",
  "baby monitor",
  "kitchen gadget",
  "portable charger",
  "resistance bands",
  "led desk lamp",
  "water bottle",
] as const;

export type IntelSeedKeyword = (typeof INTEL_SEED_KEYWORDS)[number];
