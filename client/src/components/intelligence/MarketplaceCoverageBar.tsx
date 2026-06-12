import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import type { SearchProviderStatus, SupplierPlatformStatus } from "@shared/searchTypes";
import { AlertTriangle, CheckCircle2, CircleDashed, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MarketplaceCoverageBarProps = {
  className?: string;
  compact?: boolean;
  /** When true, only show search providers (legacy ProviderStatusBar behavior). */
  searchOnly?: boolean;
};

export function MarketplaceCoverageBar({
  className,
  compact = false,
  searchOnly = false,
}: MarketplaceCoverageBarProps) {
  const { data, isLoading, isError } = trpc.search.getMarketplaceCoverage.useQuery();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}>
        <Spinner className="w-3.5 h-3.5" />
        Loading marketplace coverage…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        Marketplace coverage unavailable.
      </p>
    );
  }

  const searchConfigured = data.search.filter((p) => p.configured);
  const searchPaid = data.search.filter((p) => p.tier === "paid");
  const searchPaidConfigured = searchPaid.filter((p) => p.configured);
  const suppliersLive = data.suppliers.filter((s) => s.mode === "live");

  const isDegraded =
    searchConfigured.length > 0 &&
    searchConfigured.length < data.search.length &&
    searchPaidConfigured.length < searchPaid.length;

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {isDegraded ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong className="font-medium">Degraded coverage:</strong>{" "}
            {searchConfigured.length} of {data.search.length} search sources active
            {searchPaid.length > 0
              ? ` (${searchPaidConfigured.length}/${searchPaid.length} live APIs)`
              : ""}
            . Results may be limited until providers are configured.
          </span>
        </div>
      ) : null}

      <CoverageSection
        title="Search providers"
        summary={
          !compact
            ? `${searchConfigured.length}/${data.search.length} configured · cached by default, live when enabled`
            : undefined
        }
      >
        {data.search.map((provider) => (
          <ProviderPill key={provider.id} provider={provider} />
        ))}
      </CoverageSection>

      {!searchOnly ? (
        <CoverageSection
          title="Supplier APIs"
          summary={
            !compact
              ? `${suppliersLive.length}/${data.suppliers.length} live · catalog rows always available`
              : undefined
          }
        >
          {data.suppliers.map((supplier) => (
            <SupplierPill key={supplier.id} supplier={supplier} />
          ))}
        </CoverageSection>
      ) : null}

      {searchPaidConfigured.length === 0 ? (
        <p className="text-[10px] text-muted-foreground inline-flex items-start gap-1">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          No paid live search APIs configured — results come from cached catalogs and daily ingest.
        </p>
      ) : null}
    </div>
  );
}

function CoverageSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {summary ? <span className="text-[10px] text-muted-foreground">{summary}</span> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ProviderPill({ provider }: { provider: SearchProviderStatus }) {
  const Icon = provider.degraded
    ? AlertTriangle
    : provider.configured
      ? CheckCircle2
      : CircleDashed;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={
            provider.degraded
              ? "outline"
              : provider.configured
                ? "secondary"
                : "outline"
          }
          className={`text-[10px] gap-1 cursor-default font-normal ${
            provider.degraded
              ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
              : ""
          }`}
        >
          <Icon
            className={`w-3 h-3 ${
              provider.degraded
                ? "text-amber-600 dark:text-amber-400"
                : provider.configured
                  ? "text-success"
                  : "text-muted-foreground/60"
            }`}
          />
          {provider.label}
          {provider.degraded ? (
            <span className="opacity-60">· degraded</span>
          ) : provider.tier === "paid" ? (
            <span className="opacity-60">· live</span>
          ) : null}
        </Badge>
      </TooltipTrigger>
      {provider.note ? (
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {provider.note}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

function SupplierPill({ supplier }: { supplier: SupplierPlatformStatus }) {
  const isLive = supplier.mode === "live";
  const Icon = isLive ? CheckCircle2 : CircleDashed;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={isLive ? "secondary" : "outline"}
          className="text-[10px] gap-1 cursor-default font-normal"
        >
          <Icon
            className={`w-3 h-3 ${isLive ? "text-success" : "text-muted-foreground/60"}`}
          />
          {supplier.label}
          <span className="opacity-60">· {isLive ? "live API" : "catalog"}</span>
        </Badge>
      </TooltipTrigger>
      {supplier.note ? (
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {supplier.note}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

export function ProviderStatusBar(
  props: Omit<MarketplaceCoverageBarProps, "searchOnly">
) {
  return <MarketplaceCoverageBar {...props} searchOnly />;
}
