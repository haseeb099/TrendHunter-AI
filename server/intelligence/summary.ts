import type { ProductIntelligenceSummary, RegionCode } from "@shared/searchTypes";
import type { AdLibrarySnapshot, IntelCoverageLevel, TrendSignal } from "@shared/intelligenceTypes";
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
    stale: Boolean(trend?.stale || ads?.stale),
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

export function intelCoverageLevel(
  trend: TrendSignal | null,
  ads: AdLibrarySnapshot | null
): IntelCoverageLevel {
  const hasTrend = Boolean(trend);
  const hasAds = Boolean(ads);
  if (hasTrend && hasAds) return "high";
  if (hasTrend || hasAds) return "medium";
  return "low";
}

export function gapItemConfidence(
  demandLevel: string,
  competitionLevel: string,
  coverage: IntelCoverageLevel
): IntelCoverageLevel {
  const demand = demandLevel.toLowerCase();
  const competition = competitionLevel.toLowerCase();
  let base: IntelCoverageLevel = "medium";
  if (demand.includes("high") && competition.includes("low")) base = "high";
  else if (demand.includes("low") || competition.includes("high")) base = "low";

  if (coverage === "low") return base === "high" ? "medium" : "low";
  if (coverage === "medium" && base === "high") return "medium";
  return base;
}
