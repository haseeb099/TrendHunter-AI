import type { ProductIntelligenceSummary, RegionCode } from "@shared/searchTypes";
import { getTrendSignal } from "./trends";
import { getAdLibrarySnapshot } from "./adLibrary";

export async function getProductIntelligence(
  keyword: string,
  region: RegionCode
): Promise<ProductIntelligenceSummary> {
  const kw = keyword.trim();
  const [trend, ads] = await Promise.all([
    getTrendSignal(kw, region),
    getAdLibrarySnapshot(kw, region),
  ]);

  const fetchedAt = [trend?.fetchedAt, ads?.fetchedAt]
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  return {
    keyword: kw,
    region,
    trendMomentum: trend?.momentumScore ?? null,
    trendLabel: trend?.momentumLabel ?? null,
    changePercent90d: trend?.changePercent90d ?? null,
    activeAdCount: ads?.activeAdCount ?? null,
    advertiserCount: ads?.advertiserCount ?? null,
    fetchedAt,
  };
}

export function buildIntelligenceContext(
  keyword: string,
  trend: Awaited<ReturnType<typeof getTrendSignal>>,
  ads: Awaited<ReturnType<typeof getAdLibrarySnapshot>>
): string {
  const parts: string[] = [];

  if (trend) {
    parts.push(
      `Google Trends (${trend.region}): momentum ${trend.momentumLabel}, score ${trend.momentumScore}/100` +
        (trend.changePercent90d != null ? `, 90d change ${trend.changePercent90d}%` : "") +
        (trend.risingQueries.length ? `, rising queries: ${trend.risingQueries.slice(0, 5).join(", ")}` : "")
    );
  }

  if (ads) {
    parts.push(
      `Meta Ad Library: ${ads.activeAdCount} active ads from ${ads.advertiserCount} advertisers` +
        (ads.creatives[0]?.bodyText
          ? `, sample hook: "${ads.creatives[0].bodyText.slice(0, 120)}"`
          : "")
    );
    if (ads.gaps.length) {
      parts.push(`Market gaps: ${ads.gaps.join("; ")}`);
    }
  }

  if (!parts.length) {
    return `Keyword: ${keyword} (no cached trend/ad data — run daily ingest or use live credits)`;
  }

  return parts.join("\n");
}
