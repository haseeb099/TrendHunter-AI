import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import type { SearchProviderStatus } from "@shared/searchTypes";
import { AlertTriangle, CheckCircle2, CircleDashed, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProviderStatusBarProps = {
  className?: string;
  compact?: boolean;
};

export function ProviderStatusBar({ className, compact = false }: ProviderStatusBarProps) {
  const { data, isLoading, isError } = trpc.search.getProviderStatus.useQuery();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}>
        <Spinner className="w-3.5 h-3.5" />
        Loading data sources…
      </div>
    );
  }

  if (isError || !data?.length) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        Data source status unavailable.
      </p>
    );
  }

  const configured = data.filter((p) => p.configured);
  const livePaid = configured.filter((p) => p.tier === "paid");
  const paidProviders = data.filter((p) => p.tier === "paid");
  const paidConfigured = paidProviders.filter((p) => p.configured);
  const isDegraded =
    configured.length > 0 &&
    configured.length < data.length &&
    paidConfigured.length < paidProviders.length;

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {isDegraded ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong className="font-medium">Degraded coverage:</strong>{" "}
            {configured.length} of {data.length} data sources active
            {paidProviders.length > 0
              ? ` (${paidConfigured.length}/${paidProviders.length} live APIs)`
              : ""}
            . Results may be limited to cached catalogs until all providers are configured.
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Data sources
        </span>
        {!compact ? (
          <span className="text-[10px] text-muted-foreground">
            {configured.length}/{data.length} configured · cached by default, live when enabled
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.map((provider) => (
          <ProviderPill key={provider.id} provider={provider} />
        ))}
      </div>
      {livePaid.length === 0 ? (
        <p className="text-[10px] text-muted-foreground inline-flex items-start gap-1">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          No paid live APIs configured — results come from cached catalogs and daily ingest.
        </p>
      ) : null}
    </div>
  );
}

function ProviderPill({ provider }: { provider: SearchProviderStatus }) {
  const Icon = provider.configured ? CheckCircle2 : CircleDashed;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={provider.configured ? "secondary" : "outline"}
          className="text-[10px] gap-1 cursor-default font-normal"
        >
          <Icon
            className={`w-3 h-3 ${provider.configured ? "text-success" : "text-muted-foreground/60"}`}
          />
          {provider.label}
          {provider.tier === "paid" ? (
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
