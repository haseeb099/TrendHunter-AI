import { usePlan } from "@/_core/hooks/usePlan";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { isUnlimited } from "@shared/plans";
import { isUnlimitedCredits } from "@shared/credits";
import { Sparkles, Zap, FolderOpen } from "lucide-react";

export function SocialKitUsageBar() {
  const { subscription } = usePlan();
  const limitsQuery = trpc.social.getKitLimits.useQuery();
  const walletQuery = trpc.credits.getWallet.useQuery();

  const aiLimit = subscription?.limits.aiCallsPerMonth ?? 0;
  const aiUsed = subscription?.usage.aiCallsThisMonth ?? 0;
  const aiPct = !isUnlimited(aiLimit) && aiLimit > 0 ? Math.min(100, (aiUsed / aiLimit) * 100) : 0;

  const creditsAllowance = walletQuery.data?.monthlyAllowance ?? subscription?.credits.monthlyAllowance ?? 0;
  const creditsBalance = walletQuery.data?.balance ?? subscription?.credits.balance ?? 0;
  const creditsUnlimited = isUnlimitedCredits(creditsAllowance);

  const savedCount = limitsQuery.data?.savedCount ?? 0;
  const savedLimit = limitsQuery.data?.savedLimit ?? 0;
  const savedUnlimited = isUnlimitedCredits(savedLimit);

  return (
    <div className="card-elevated p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Your usage & limits</p>
        <Badge variant="secondary" className="text-[10px]">
          Pro+ feature
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            AI calls this month
          </div>
          <p className="text-sm font-semibold tabular-nums">
            {isUnlimited(aiLimit) ? `${aiUsed} / ∞` : `${aiUsed} / ${aiLimit}`}
          </p>
          <p className="text-[11px] text-muted-foreground">1 call per generator · 1 call for full kit</p>
          {!isUnlimited(aiLimit) ? <Progress value={aiPct} className="h-1.5" /> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5" />
            Live credits balance
          </div>
          <p className="text-sm font-semibold tabular-nums">
            {creditsUnlimited ? "Unlimited" : creditsBalance}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Live trend refresh: 1 credit · optional on hashtags
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderOpen className="w-3.5 h-3.5" />
            Saved kits
          </div>
          <p className="text-sm font-semibold tabular-nums">
            {savedUnlimited ? `${savedCount} / ∞` : `${savedCount} / ${savedLimit}`}
          </p>
          <p className="text-[11px] text-muted-foreground">Save & reload anytime from history</p>
        </div>
      </div>
    </div>
  );
}
