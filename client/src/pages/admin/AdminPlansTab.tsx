import { useEffect, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PlanRow = RouterOutputs["admin"]["listPlans"][number];
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ALL_FEATURE_IDS, type FeatureId, type PlanId } from "@shared/plans";
import { Save } from "lucide-react";
import { toast } from "sonner";

const FEATURE_LABELS: Record<FeatureId, string> = {
  discover: "Discover & search",
  validate: "AI validation",
  competitors: "Competitor spy",
  marketgap: "Market gap finder",
  profit: "Profit calculator",
  suppliers: "Supplier vetting",
  supplier_offers: "Live supplier offers",
  social: "Social media kit",
  agent: "AI research agent",
  pipeline: "Product pipeline",
  watchlist: "Watchlist",
  analytics: "Analytics",
  filter_presets: "Filter presets",
  analytics_advanced: "Advanced analytics",
};

export default function AdminPlansTab() {
  const utils = trpc.useUtils();
  const plansQuery = trpc.admin.listPlans.useQuery();
  const [editingId, setEditingId] = useState<PlanId | null>(null);

  const updatePlan = trpc.admin.updatePlan.useMutation({
    onSuccess: async () => {
      await utils.admin.listPlans.invalidate();
      toast.success("Plan saved");
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  if (plansQuery.isLoading) return <AdminLoading label="Loading plans…" />;
  if (plansQuery.isError) {
    return (
      <AdminEmptyState
        title="Could not load plans"
        description={plansQuery.error.message}
      />
    );
  }

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-6 admin-stagger">
      <AdminPageHeader
        title="Plans & pricing"
        description="Edit prices, feature gates, and usage limits. Changes apply live for every customer."
        icon={CreditCard}
      />

      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanEditor
            key={plan.id}
            plan={plan}
            expanded={editingId === plan.id}
            onToggle={() => setEditingId(editingId === plan.id ? null : plan.id)}
            onSave={(data) => updatePlan.mutate({ planId: plan.id, ...data })}
            pending={updatePlan.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function PlanEditor({
  plan,
  expanded,
  onToggle,
  onSave,
  pending,
}: {
  plan: PlanRow;
  expanded: boolean;
  onToggle: () => void;
  onSave: (data: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(plan.name);
  const [tagline, setTagline] = useState(plan.tagline ?? "");
  const [price, setPrice] = useState(String(plan.priceMonthly));
  const [billingPeriod, setBillingPeriod] = useState(plan.billingPeriod);
  const [highlight, setHighlight] = useState(plan.highlight);
  const [isActive, setIsActive] = useState(plan.isActive);
  const [sortOrder, setSortOrder] = useState(String(plan.sortOrder));
  const [trialDays, setTrialDays] = useState(String(plan.trialDays ?? 3));
  const [featuresText, setFeaturesText] = useState(plan.features.join("\n"));
  const [featureIds, setFeatureIds] = useState<FeatureId[]>(plan.featureIds as FeatureId[]);
  const [limits, setLimits] = useState(plan.limits);

  useEffect(() => {
    if (!expanded) return;
    setName(plan.name);
    setTagline(plan.tagline ?? "");
    setPrice(String(plan.priceMonthly));
    setBillingPeriod(plan.billingPeriod);
    setHighlight(plan.highlight);
    setIsActive(plan.isActive);
    setSortOrder(String(plan.sortOrder));
    setTrialDays(String(plan.trialDays ?? 3));
    setFeaturesText(plan.features.join("\n"));
    setFeatureIds(plan.featureIds as FeatureId[]);
    setLimits(plan.limits);
  }, [expanded, plan]);

  const toggleFeature = (id: FeatureId) => {
    setFeatureIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <article className={cn("admin-plan-card", expanded && "admin-plan-card-expanded")}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold">{plan.name}</h3>
            {!plan.isActive ? <Badge variant="outline">Hidden</Badge> : null}
            {plan.highlight ? <Badge>Featured</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{plan.tagline}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold tabular-nums">{plan.priceLabel}</p>
          <p className="text-xs text-muted-foreground capitalize">{plan.id}</p>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border p-5 space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="input-elegant h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Monthly price ($)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-elegant h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Billing period label</Label>
              <Input
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="input-elegant h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input-elegant h-9"
              />
            </div>
            {plan.id === "trial" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Trial length (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="input-elegant h-9"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="input-elegant h-9" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Marketing bullets (one per line)</Label>
            <Textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={4}
              className="input-elegant resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Feature access</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {ALL_FEATURE_IDS.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-2 text-sm rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/30"
                >
                  <Checkbox
                    checked={featureIds.includes(id)}
                    onCheckedChange={() => toggleFeature(id)}
                  />
                  {FEATURE_LABELS[id]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                ["searchesPerMonth", "Searches / month"],
                ["aiCallsPerMonth", "AI calls / month"],
                ["pipelineItems", "Pipeline items"],
                ["watchlistItems", "Watchlist items"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  min={-1}
                  value={limits[key]}
                  onChange={(e) =>
                    setLimits((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                  className="input-elegant h-9"
                  placeholder="-1 = unlimited"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={highlight} onCheckedChange={setHighlight} />
              Featured on pricing page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              Visible to customers
            </label>
          </div>

          <Button
            disabled={pending}
            onClick={() =>
              onSave({
                name,
                tagline,
                priceMonthly: Number(price),
                billingPeriod,
                highlight,
                isActive,
                sortOrder: Number(sortOrder),
                ...(plan.id === "trial" ? { trialDays: Number(trialDays) } : {}),
                features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
                featureIds,
                limits,
              })
            }
          >
            {pending ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save plan
          </Button>
        </div>
      ) : null}
    </article>
  );
}
