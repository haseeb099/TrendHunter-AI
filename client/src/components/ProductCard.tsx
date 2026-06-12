import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Star,
  Truck,
  Heart,
  Plus,
  ExternalLink,
  TrendingUp,
  ShieldCheck,
  Eye,
  LineChart,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import type { ProductSearchResult } from "@shared/searchTypes";
import { formatProductPrice } from "@shared/searchTypes";
import type { ProductDrawerTab } from "@/components/product-workspace/types";
import { Link } from "wouter";
import { getDashboardPath } from "@/config/dashboardNav";
import { keywordToSlug } from "@shared/keywordUtils";
import { TrendScoreExplain } from "@/components/intelligence/TrendScoreExplain";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
import { SupplierMatchBadge } from "@/components/product-workspace/SupplierMatchBadge";
import { useTrendWindow } from "@/_core/hooks/useTrendWindow";
import { useProductAnalytics } from "@/_core/hooks/useProductAnalytics";
import { useEffect, useRef } from "react";

type ProductCardProps = {
  product: ProductSearchResult;
  onSave?: (product: ProductSearchResult) => void;
  onPipeline?: (product: ProductSearchResult) => void;
  onViewDetails?: (product: ProductSearchResult, tab?: ProductDrawerTab) => void;
  savePending?: boolean;
  pipelinePending?: boolean;
  showTrendBadge?: boolean;
  /** Show Discover rank explanation (rankReason). */
  showRankReason?: boolean;
};

export function ProductCard({
  product,
  onSave,
  onPipeline,
  onViewDetails,
  savePending,
  pipelinePending,
  showTrendBadge = true,
  showRankReason = false,
}: ProductCardProps) {
  const currency = product.currency ?? "USD";
  const { label: trendWindowLabel } = useTrendWindow();
  const { track } = useProductAnalytics();
  const impressionSent = useRef(false);
  const sourcingProviderLabel =
    product.platform === "cj" || product.sourceProvider === "cj"
      ? "CJ Dropshipping"
      : product.platform === "aliexpress" || product.sourceProvider === "aliexpress"
        ? "AliExpress"
        : null;

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    track("product_impression", {
      canonicalProductId: product.canonicalProductId,
      productId: product.id,
      platform: product.platform,
      sourceProvider: product.sourceProvider,
    });
  }, [product.canonicalProductId, product.id, product.platform, product.sourceProvider, track]);

  return (
    <Card className="surface-interactive overflow-hidden p-0 flex flex-col group">
      <button
        type="button"
        className="aspect-[4/3] bg-muted/40 border-b border-border flex items-center justify-center overflow-hidden w-full cursor-pointer relative"
        onClick={() => {
          track("product_click", {
            canonicalProductId: product.canonicalProductId,
            productId: product.id,
            sourceProvider: product.sourceProvider,
          });
          onViewDetails?.(product, "overview");
        }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <Search className="w-8 h-8 text-muted-foreground/25" />
        )}
        {onViewDetails ? (
          <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              View product
            </span>
          </span>
        ) : null}
      </button>
      <div className="p-4 flex flex-col flex-1 gap-4">
        <div className="space-y-2">
          <button
            type="button"
            className="text-left w-full"
            onClick={() => {
          track("product_click", {
            canonicalProductId: product.canonicalProductId,
            productId: product.id,
            sourceProvider: product.sourceProvider,
          });
          onViewDetails?.(product, "overview");
        }}
          >
            <h3 className="font-display text-[15px] font-semibold leading-snug line-clamp-2 hover:text-primary transition-colors">
              {product.title}
            </h3>
          </button>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="capitalize text-[11px]">
              {product.platform}
            </Badge>
            {product.region ? (
              <Badge variant="outline" className="text-[11px]">
                {product.region}
              </Badge>
            ) : null}
            {showTrendBadge && product.isTrending ? (
              <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending · {trendWindowLabel}
              </Badge>
            ) : null}
            {product.supplierMatchState && product.supplierMatchState !== "none" ? (
              <SupplierMatchBadge matchState={product.supplierMatchState} compact />
            ) : null}
            {sourcingProviderLabel ? (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Truck className="w-3 h-3" />
                {sourcingProviderLabel}
              </Badge>
            ) : null}
            {product.sourceProvider && !sourcingProviderLabel ? (
              <Badge variant="outline" className="text-[10px] capitalize">
                via {product.sourceProvider.replace("_", " ")}
              </Badge>
            ) : null}
            {product.dataLabel ? (
              <DataFreshnessBadge
                state={product.dataState}
                label={product.dataLabel}
              />
            ) : null}
            {product.inferredScores ? (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                <AlertTriangle className="w-3 h-3" />
                Estimated scores
              </Badge>
            ) : null}
            {product.supplier ? (
              <Badge variant="outline" className="text-muted-foreground text-[11px]">
                {product.supplier}
              </Badge>
            ) : null}
          </div>
          {showRankReason && product.rankReason ? (
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
              {product.rankReason}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm mt-auto">
          <div>
            <p className="metric-label text-[10px] mb-0.5">Price</p>
            <p className="font-semibold tabular-nums">{formatProductPrice(product.price, currency)}</p>
          </div>
          {product.shippingDays !== null ? (
            <div>
              <p className="metric-label text-[10px] mb-0.5">Ship</p>
              <p className="flex items-center gap-1 text-[13px]">
                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                {product.shippingDays}d
              </p>
            </div>
          ) : null}
          {product.rating !== null ? (
            <div>
              <p className="metric-label text-[10px] mb-0.5">Rating</p>
              <p className="flex items-center gap-1 text-[13px]">
                <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                {product.rating}
              </p>
            </div>
          ) : product.trendScore !== undefined ? (
            <div>
              <p className="metric-label text-[10px] mb-0.5">Trend</p>
              <TrendScoreExplain
                score={product.trendScore}
                inputs={product.trendScoreInputs}
                compact
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          {onSave ? (
            <Button
              size="sm"
              onClick={() => onSave(product)}
              disabled={savePending}
              className="flex-1 min-w-[90px]"
            >
              <Heart className="w-3.5 h-3.5" />
              Save
            </Button>
          ) : null}
          {onPipeline ? (
            <Button
              size="sm"
              onClick={() => onPipeline(product)}
              disabled={pipelinePending}
              variant="outline"
              className="flex-1 min-w-[90px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Pipeline
            </Button>
          ) : null}
          {onViewDetails ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => onViewDetails(product, "overview")}
              className="flex-1 min-w-[100px]"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Details
            </Button>
          ) : null}
          {onViewDetails ? (
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              title="Validate in panel"
              onClick={() => onViewDetails(product, "validate")}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </Button>
          ) : null}
          {onViewDetails ? (
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              title="Competitor spy in panel"
              onClick={() => onViewDetails(product, "competitors")}
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          ) : null}
          {onViewDetails ? (
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              title="Market intelligence"
              onClick={() => onViewDetails(product, "intelligence")}
            >
              <LineChart className="w-3.5 h-3.5" />
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" className="px-2" title="Social media kit" asChild>
            <Link
              href={`${getDashboardPath("social")}?productTitle=${encodeURIComponent(product.title)}&region=${product.region ?? "US"}&productId=${encodeURIComponent(product.id)}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button size="sm" variant="ghost" className="px-2" title="Public trend report" asChild>
            <Link
              href={`/trends/${keywordToSlug(product.title)}?region=${product.region ?? "US"}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </Link>
          </Button>
          {product.sourceUrl ? (
            <Button size="sm" variant="ghost" className="px-2" asChild>
              <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" title="View listing">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
