import { sanitizeKeyword } from "./keywordUtils";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "by",
  "from",
]);

/** Shorten noisy product titles into a trend/ad-friendly keyword (max 5 tokens). */
export function normalizeIntelKeyword(input: string): string {
  const cleaned = sanitizeKeyword(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const words = cleaned.split(" ").filter((word) => word && !STOP_WORDS.has(word));
  const picked = (words.length > 0 ? words : cleaned.split(" ")).slice(0, 5);
  return picked.join(" ").trim();
}
