import type { RegionCode } from "@shared/searchTypes";
import { desc, eq } from "drizzle-orm";
import { trendSignals } from "../../drizzle/schema";
import { getDb } from "../db";
import { inferCategoryFromTitle } from "../search/categories";

const SYNONYM_MAP: Record<string, string[]> = {
  earbuds: ["earphones", "wireless earbuds", "bluetooth earbuds"],
  earphones: ["earbuds", "wireless earbuds"],
  serum: ["face serum", "skincare serum"],
  "led strip": ["led lights", "strip lights", "led strip lights"],
  "yoga mat": ["yoga mats", "exercise mat"],
};

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of Array.from(tokensA)) {
    if (tokensB.has(t)) intersection++;
  }
  return intersection / Math.max(tokensA.size, tokensB.size);
}

function extractNounPhrase(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return words.slice(0, 4).join(" ");
}

async function getTrendKeywords(region: RegionCode): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ keyword: trendSignals.keyword })
    .from(trendSignals)
    .where(eq(trendSignals.region, region))
    .orderBy(desc(trendSignals.fetchedAt))
    .limit(50);
  return rows.map((r) => r.keyword);
}

/** Link product title to best trend keyword for signal fusion. */
export async function linkKeywordFromTitle(
  title: string,
  region: RegionCode
): Promise<string> {
  const phrase = extractNounPhrase(title);
  const trendKeywords = await getTrendKeywords(region);

  if (trendKeywords.includes(phrase)) return phrase;

  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const all = [canonical, ...synonyms];
    if (all.some((s) => phrase.includes(s))) {
      const match = trendKeywords.find((kw) =>
        all.some((s) => kw.includes(s) || s.includes(kw))
      );
      if (match) return match;
    }
  }

  let bestKw = phrase;
  let bestScore = 0;
  for (const kw of trendKeywords) {
    const score = tokenOverlap(phrase, kw);
    if (score >= 0.5 && score > bestScore) {
      bestScore = score;
      bestKw = kw;
    }
  }
  if (bestScore >= 0.5) return bestKw;

  const category = inferCategoryFromTitle(title);
  if (category) {
    const catMatch = trendKeywords.find((kw) => inferCategoryFromTitle(kw) === category);
    if (catMatch) return catMatch;
  }

  return phrase || title.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
}
