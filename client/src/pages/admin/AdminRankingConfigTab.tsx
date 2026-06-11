import { useEffect, useMemo, useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import type { RankingWeights } from "../../../../server/ranking/scoreProduct";
import { RANKING_WEIGHT_KEYS } from "../../../../server/ranking/scoreProduct";
import { Save, Scale, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

const WEIGHT_LABELS: Record<keyof RankingWeights, string> = {
  trendMomentum: "Trend momentum",
  demandPersistence: "Demand persistence",
  metaAdSaturation: "Meta ad saturation",
  tiktokPressure: "TikTok creative pressure",
  marginSpread: "Margin spread",
  supplierConfidence: "Supplier confidence",
  competitionIntensity: "Competition intensity",
  freshnessDecay: "Freshness decay",
  queryIntentMatch: "Query intent match",
  returnRisk: "Return risk",
};

const REGIONS = ["US", "UK", "EU", "GLOBAL"] as const;

export default function AdminRankingConfigTab() {
  const utils = trpc.useUtils();
  const configsQuery = trpc.admin.getRankingConfigs.useQuery();
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const [region, setRegion] = useState<string>("global");
  const [isActive, setIsActive] = useState(true);
  const [weights, setWeights] = useState<RankingWeights | null>(null);

  const updateConfig = trpc.admin.updateRankingConfig.useMutation({
    onSuccess: async () => {
      await utils.admin.getRankingConfigs.invalidate();
      toast.success("Ranking weights saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const configs = configsQuery.data?.configs ?? [];
  const defaults = configsQuery.data?.defaults;

  const selectedConfig = useMemo(
    () => (typeof selectedId === "number" ? configs.find((c) => c.id === selectedId) : null),
    [configs, selectedId]
  );

  useEffect(() => {
    if (!defaults) return;
    if (selectedConfig) {
      setWeights(selectedConfig.weights);
      setRegion(selectedConfig.region ?? "global");
      setIsActive(selectedConfig.isActive);
      return;
    }
    setWeights({ ...defaults });
    setRegion("global");
    setIsActive(true);
  }, [defaults, selectedConfig, selectedId]);

  if (configsQuery.isLoading) return <AdminLoading label="Loading ranking configs…" />;
  if (configsQuery.isError) {
    return (
      <AdminEmptyState
        title="Could not load ranking configs"
        description={configsQuery.error.message}
      />
    );
  }

  if (!weights || !defaults) {
    return (
      <AdminEmptyState
        title="No ranking defaults"
        description="Ranking weight defaults are unavailable."
      />
    );
  }

  const weightTotal = RANKING_WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);

  const handleSave = () => {
    updateConfig.mutate({
      id: typeof selectedId === "number" ? selectedId : undefined,
      region: region === "global" ? null : (region as (typeof REGIONS)[number]),
      weights,
      isActive,
    });
  };

  const handleResetDefaults = () => {
    setWeights({ ...defaults });
  };

  return (
    <div className="space-y-8 admin-stagger">
      <AdminPageHeader
        title="Ranking weights"
        description="Tune scoreProduct v2 signal weights without redeploying. Active configs override code defaults per region."
        icon={Scale}
      />

      <AdminSection
        title="Config scope"
        description="Select an existing config or create a new regional override"
        icon={SlidersHorizontal}
        flush
      >
        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Config</Label>
            <Select
              value={selectedId === "new" ? "new" : String(selectedId)}
              onValueChange={(value) => setSelectedId(value === "new" ? "new" : Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose config" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New config</SelectItem>
                {configs.map((config) => (
                  <SelectItem key={config.id} value={String(config.id)}>
                    {config.region ?? "Global"} · v{config.version}
                    {config.isActive ? "" : " (inactive)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Region scope</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (all regions)</SelectItem>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2">
              <Label htmlFor="ranking-active">Active</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch id="ranking-active" checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-sm text-muted-foreground">
                  {isActive ? "Applied to scoring" : "Inactive"}
                </span>
              </div>
            </div>
            <Badge variant={Math.abs(weightTotal - 1) < 0.05 ? "default" : "outline"}>
              Σ {weightTotal.toFixed(2)}
            </Badge>
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Signal weights"
        description="Higher weight amplifies that signal in the fused trend score"
        icon={SlidersHorizontal}
        flush
      >
        <div className="space-y-5 p-5 sm:p-6">
          {RANKING_WEIGHT_KEYS.map((key) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{WEIGHT_LABELS[key]}</span>
                <span className="tabular-nums text-muted-foreground">
                  {(weights[key] * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[Math.round(weights[key] * 100)]}
                min={0}
                max={40}
                step={1}
                onValueChange={([value]) =>
                  setWeights((prev) =>
                    prev ? { ...prev, [key]: Math.round(value) / 100 } : prev
                  )
                }
              />
            </div>
          ))}
        </div>
      </AdminSection>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          <Save className="h-4 w-4" />
          {updateConfig.isPending ? "Saving…" : "Save config"}
        </Button>
        <Button variant="outline" onClick={handleResetDefaults}>
          Reset to code defaults
        </Button>
      </div>
    </div>
  );
}
