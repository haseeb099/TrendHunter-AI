import { desc, gt } from "drizzle-orm";
import { trendSignals } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { keywordToSlug } from "@shared/keywordUtils";

type SitemapUrl = {
  loc: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
  lastmod?: string;
};

export async function listSitemapTrendKeywords(limit = 500): Promise<
  Array<{ keyword: string; lastmod: string }>
> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const rows = await db
    .select({
      keyword: trendSignals.keyword,
      fetchedAt: trendSignals.fetchedAt,
    })
    .from(trendSignals)
    .where(gt(trendSignals.expiresAt, now))
    .orderBy(desc(trendSignals.fetchedAt))
    .limit(limit * 3);

  const seen = new Set<string>();
  const results: Array<{ keyword: string; lastmod: string }> = [];

  for (const row of rows) {
    const kw = row.keyword.trim().toLowerCase();
    if (!kw || seen.has(kw)) continue;
    seen.add(kw);
    results.push({
      keyword: kw,
      lastmod: row.fetchedAt.toISOString().slice(0, 10),
    });
    if (results.length >= limit) break;
  }

  return results;
}

export async function buildSitemapXml(): Promise<string> {
  const base = ENV.appUrl;
  const urls: SitemapUrl[] = [
    { loc: `${base}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${base}/login`, changefreq: "monthly", priority: "0.3" },
    { loc: `${base}/register`, changefreq: "monthly", priority: "0.4" },
  ];

  const trends = await listSitemapTrendKeywords();
  for (const trend of trends) {
    urls.push({
      loc: `${base}/trends/${keywordToSlug(trend.keyword)}`,
      changefreq: "daily",
      priority: "0.7",
      lastmod: trend.lastmod,
    });
  }

  const body = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : "";
      return `  <url>
    <loc>${escapeXml(url.loc)}</loc>${lastmod}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
