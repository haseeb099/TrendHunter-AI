import { useEffect, useState } from "react";
import { usePlan } from "@/_core/hooks/usePlan";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { getDashboardPath } from "@/config/dashboardNav";
import { trpc } from "@/lib/trpc";
import { isUnlimited, type PlanId } from "@shared/plans";
import { isUnlimitedCredits } from "@shared/credits";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Check,
  CreditCard,
  Crown,
  Settings,
  Sparkles,
  Ticket,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type BillingTab = "subscription" | "usage" | "plans";

export default function Billing() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const {
    subscription,
    displayName,
    isTrial,
    daysLeftInTrial,
    canStartTrial,
    selfServeBilling,
    stripeConfigured,
  } = usePlan();
  const plansQuery = trpc.billing.getPlans.useQuery();
  const [activeTab, setActiveTab] = useState<BillingTab>("subscription");

  const selectPlan = trpc.billing.selectPlan.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Plan updated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const creditPacksQuery = trpc.billing.getCreditPacks.useQuery();

  const createCreditCheckout = trpc.billing.createCreditCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const startTrial = trpc.billing.startTrial.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Pro trial started");
    },
    onError: (err) => toast.error(err.message),
  });

  const [couponCode, setCouponCode] = useState("");

  const redeemCoupon = trpc.billing.redeemCoupon.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      setCouponCode("");
      toast.success(data.message);
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      toast.success("Welcome! Your Pro trial is active — explore the workspace.");
      params.delete("welcome");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    if (params.get("checkout") === "success") {
      toast.success("Payment received — your plan will update shortly.");
      void utils.auth.me.invalidate();
      params.delete("checkout");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    if (params.get("checkout") === "cancel") {
      toast.message("Checkout cancelled");
      params.delete("checkout");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    if (params.get("credits") === "success") {
      toast.success("Credits added to your wallet.");
      void utils.auth.me.invalidate();
      void utils.credits.getWallet.invalidate();
      params.delete("credits");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    if (params.get("credits") === "cancel") {
      toast.message("Credit purchase cancelled");
      params.delete("credits");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [utils.auth.me, utils.credits.getWallet]);

  if (plansQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (plansQuery.isError) {
    return (
      <div className="card-elevated max-w-md mx-auto p-8 text-center space-y-4">
        <p className="font-medium text-sm">Could not load plans</p>
        <p className="text-sm text-muted-foreground">{plansQuery.error.message}</p>
        <Button variant="outline" onClick={() => plansQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const plans = plansQuery.data?.plans ?? [];
  const searchLimit = subscription?.limits.searchesPerMonth ?? 0;
  const searchesUsed = subscription?.usage.searchesThisMonth ?? 0;
  const aiLimit = subscription?.limits.aiCallsPerMonth ?? 0;
  const aiUsed = subscription?.usage.aiCallsThisMonth ?? 0;
  const searchPct = searchLimit > 0 ? Math.min(100, (searchesUsed / searchLimit) * 100) : 0;
  const aiPct = aiLimit > 0 ? Math.min(100, (aiUsed / aiLimit) * 100) : 0;
  const creditsAllowance = subscription?.credits.monthlyAllowance ?? 0;
  const creditsUsed = subscription?.usage.creditsUsedThisMonth ?? 0;
  const creditsPct =
    !isUnlimitedCredits(creditsAllowance) && creditsAllowance > 0
      ? Math.min(100, Math.round((creditsUsed / creditsAllowance) * 100))
      : 0;

  const handleSelect = (planId: PlanId) => {
    if (planId === "trial") return;
    if (stripeConfigured && selfServeBilling) {
      createCheckout.mutate({ planId });
      return;
    }
    selectPlan.mutate({ planId });
  };

  const checkoutPending = createCheckout.isPending || selectPlan.isPending;

  const tabs: { id: BillingTab; label: string; icon: typeof CreditCard }[] = [
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "usage", label: "Usage", icon: BarChart3 },
    { id: "plans", label: "All plans", icon: Crown },
  ];

  return (
    <div className="space-y-8 fade-up">
      <PageHeader
        title="Billing & subscription"
        description="Manage your plan, track usage, apply coupons, and upgrade when you're ready to scale."
        actions={
          <Button variant="outline" size="sm" onClick={() => setLocation(getDashboardPath("account"))}>
            <Settings className="w-4 h-4" />
            Account settings
          </Button>
        }
      />

      <div className="flex gap-1 p-1 rounded-xl bg-muted/40 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "subscription" ? (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Current plan" value={displayName} icon={Crown} />
            <StatCard
              label="Status"
              value={subscription?.isActive ? "Active" : "Inactive"}
              valueClassName={subscription?.isActive ? "text-success" : "text-warning"}
            />
            <StatCard
              label="Searches / mo"
              value={
                isUnlimited(searchLimit)
                  ? `${searchesUsed} / ∞`
                  : `${searchesUsed} / ${searchLimit}`
              }
            />
            <StatCard label="Pipeline" value={String(subscription?.usage.pipelineItems ?? 0)} />
          </div>

          {isTrial && daysLeftInTrial !== null ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>
                  Pro trial — <strong>{daysLeftInTrial}</strong> day
                  {daysLeftInTrial === 1 ? "" : "s"} remaining
                </span>
              </div>
              <Badge variant="outline">Full Pro access</Badge>
            </div>
          ) : null}

          <div className="card-elevated p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="coupon-code" className="text-sm font-medium flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                Promo code
              </label>
              <Input
                id="coupon-code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="input-elegant max-w-xs font-mono"
              />
            </div>
            <Button
              variant="outline"
              disabled={!couponCode.trim() || redeemCoupon.isPending}
              onClick={() => redeemCoupon.mutate({ code: couponCode.trim() })}
            >
              {redeemCoupon.isPending ? <Spinner className="w-4 h-4" /> : "Apply code"}
            </Button>
          </div>

          {stripeConfigured && subscription?.isActive ? (
            <div className="card-elevated p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Manage subscription</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Update payment method, view invoices, or cancel via Stripe.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => createPortal.mutate()}
                disabled={createPortal.isPending}
              >
                {createPortal.isPending ? <Spinner className="w-4 h-4" /> : "Billing portal"}
              </Button>
            </div>
          ) : null}

          {canStartTrial ? (
            <div className="card-elevated p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Start your free Pro trial</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  No card required — unlock AI validation, competitor spy, and more.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => startTrial.mutate()}
                disabled={startTrial.isPending}
              >
                {startTrial.isPending ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                Start trial
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "usage" ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <UsageMeter
              label="Searches this month"
              used={searchesUsed}
              limit={searchLimit}
              pct={searchPct}
            />
            <UsageMeter
              label="AI calls this month"
              used={aiUsed}
              limit={aiLimit}
              pct={aiPct}
            />
            <UsageMeter
              label="Live credits used"
              used={creditsUsed}
              limit={creditsAllowance}
              pct={creditsPct}
              unlimited={isUnlimitedCredits(creditsAllowance)}
            />
            <StatCard
              label="Credits balance"
              value={
                isUnlimitedCredits(creditsAllowance)
                  ? "Unlimited"
                  : String(subscription?.credits.balance ?? 0)
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cached Discover and trending are free. Live search, trends, and Ad Library scans use credits.
          </p>

          {creditPacksQuery.data?.stripeConfigured &&
          (creditPacksQuery.data.packs.length > 0 || creditPacksQuery.data.catalog.length > 0) ? (
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                <h3 className="font-medium text-sm">Buy more live credits</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                One-time top-ups never expire — they roll over each month on top of your plan allowance.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {(creditPacksQuery.data.packs.length > 0
                  ? creditPacksQuery.data.packs
                  : creditPacksQuery.data.catalog
                ).map((pack) => {
                  const purchasable = creditPacksQuery.data.packs.some((p) => p.id === pack.id);
                  return (
                    <div
                      key={pack.id}
                      className="rounded-xl border border-border p-4 flex flex-col gap-3"
                    >
                      <div>
                        <p className="font-semibold">{pack.label}</p>
                        <p className="text-2xl font-display mt-1">{pack.priceLabel}</p>
                        <p className="text-xs text-muted-foreground mt-2">{pack.description}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-auto"
                        disabled={!purchasable || createCreditCheckout.isPending}
                        onClick={() =>
                          createCreditCheckout.mutate({
                            packId: pack.id as "pack_50" | "pack_100" | "pack_250",
                          })
                        }
                      >
                        {purchasable ? "Buy credits" : "Coming soon"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-4">
            <StatCard label="Pipeline items" value={String(subscription?.usage.pipelineItems ?? 0)} />
            <StatCard label="Watchlist items" value={String(subscription?.usage.watchlistItems ?? 0)} />
          </div>
          {!subscription?.isActive ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
              Your subscription is inactive. Upgrade or apply a coupon to restore full access.
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "plans" ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent =
              subscription?.planId === plan.id ||
              (subscription?.isTrial && plan.id === "trial");

            return (
              <article
                key={plan.id}
                className={cn(
                  "card-elevated p-6 flex flex-col",
                  plan.highlight && "ring-1 ring-primary/30",
                  isCurrent && "border-primary/40"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display font-semibold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                  </div>
                  {isCurrent ? <Badge>Current</Badge> : null}
                </div>

                <div className="mb-5">
                  <span className="stat-value text-3xl">{plan.priceLabel}</span>
                  {plan.priceMonthly > 0 ? (
                    <span className="text-sm text-muted-foreground"> / mo</span>
                  ) : (
                    <span className="text-sm text-muted-foreground"> · {plan.billingPeriod}</span>
                  )}
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.id === "trial" ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!canStartTrial || startTrial.isPending}
                    onClick={() => startTrial.mutate()}
                  >
                    {canStartTrial ? "Start trial" : "Trial used"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={isCurrent || checkoutPending || !selfServeBilling}
                    onClick={() => handleSelect(plan.id as PlanId)}
                  >
                    {isCurrent
                      ? "Current plan"
                      : !selfServeBilling
                        ? "Contact support"
                        : stripeConfigured
                          ? `Subscribe to ${plan.name}`
                          : `Choose ${plan.name}`}
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground text-center max-w-lg mx-auto">
        {stripeConfigured
          ? "Paid plans use secure Stripe checkout. Your subscription syncs automatically after payment."
          : selfServeBilling
            ? "Plan changes apply immediately during beta (Stripe not configured)."
            : "Self-serve upgrades are disabled. Redeem a coupon code above or contact support to change your plan."}
      </p>
    </div>
  );
}

function UsageMeter({
  label,
  used,
  limit,
  pct,
  unlimited,
}: {
  label: string;
  used: number;
  limit: number;
  pct: number;
  unlimited?: boolean;
}) {
  const showUnlimited = unlimited ?? isUnlimited(limit);
  return (
    <div className="card-elevated p-5 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">
          {showUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!showUnlimited && limit > 0 ? <Progress value={pct} className="h-2" /> : null}
    </div>
  );
}
