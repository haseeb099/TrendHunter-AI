import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { getDashboardPath } from "@/config/dashboardNav";

export function CreditBalance() {
  const wallet = trpc.credits.getWallet.useQuery();

  const balance = wallet.data?.balance ?? 0;
  const allowance = wallet.data?.monthlyAllowance ?? 0;
  const unlimited = allowance < 0;
  const noLiveCredits = !unlimited && allowance === 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={noLiveCredits ? "secondary" : "outline"}
          className="gap-1 cursor-default font-normal"
          asChild={noLiveCredits}
        >
          {noLiveCredits ? (
            <Link href={getDashboardPath("billing")} className="inline-flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-muted-foreground" />
              Cached only
            </Link>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-warning" />
              {unlimited ? "∞" : balance} credits
            </>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {noLiveCredits ? (
          <>
            <p className="text-xs">
              Your plan uses free cached data. Upgrade to Pro for live API refreshes.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Discover, trending, and daily intel snapshots stay free.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs">
              {unlimited
                ? "Unlimited live API credits on your plan."
                : `${balance} of ${allowance} monthly live credits remaining.`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Cached Discover & trending are free.</p>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
