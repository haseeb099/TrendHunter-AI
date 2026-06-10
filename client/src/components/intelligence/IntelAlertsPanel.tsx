import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Bell, Mail, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { RegionCode } from "@shared/searchTypes";
import { Spinner } from "@/components/ui/spinner";

type IntelAlertsPanelProps = {
  keyword?: string;
  region?: RegionCode;
  category?: string;
  onCategoryChange?: (category: string | undefined) => void;
};

export function IntelAlertsPanel({
  keyword,
  region = "US",
  category,
  onCategoryChange,
}: IntelAlertsPanelProps) {
  const utils = trpc.useUtils();
  const watchesQuery = trpc.intelligence.getKeywordWatches.useQuery();
  const prefsQuery = trpc.intelligence.getDigestPrefs.useQuery();
  const alertsQuery = trpc.intelligence.getRecentAlerts.useQuery();
  const categoriesQuery = trpc.trending.getCategories.useQuery({ region });

  const addWatch = trpc.intelligence.addKeywordWatch.useMutation({
    onSuccess: async () => {
      await utils.intelligence.getKeywordWatches.invalidate();
      toast.success("Keyword watch added — we'll alert you when it turns rising");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeWatch = trpc.intelligence.removeKeywordWatch.useMutation({
    onSuccess: async () => {
      await utils.intelligence.getKeywordWatches.invalidate();
      toast.success("Watch removed");
    },
  });

  const updatePrefs = trpc.intelligence.updateDigestPrefs.useMutation({
    onSuccess: async () => {
      await utils.intelligence.getDigestPrefs.invalidate();
      toast.success("Email digest preferences saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const prefs = prefsQuery.data;
  const watches = watchesQuery.data;

  return (
    <div className="card-elevated p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Alerts & email digest</h3>
      </div>

      {keyword?.trim() ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={addWatch.isPending}
            onClick={() =>
              addWatch.mutate({ keyword: keyword.trim(), region })
            }
          >
            {addWatch.isPending ? <Spinner className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            Watch &quot;{keyword.trim()}&quot; for rising trend
          </Button>
          {watches ? (
            <span className="text-xs text-muted-foreground">
              {watches.count} / {watches.limit < 0 ? "∞" : watches.limit} watches
            </span>
          ) : null}
        </div>
      ) : null}

      {watchesQuery.data && watchesQuery.data.watches.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Your keyword watches
          </p>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {watchesQuery.data.watches.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize truncate">{w.keyword}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {w.region}
                    {w.lastMomentumLabel ? ` · ${w.lastMomentumLabel}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-8 w-8 p-0"
                  onClick={() => removeWatch.mutate({ id: w.id })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Daily email digest</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Get rising keywords and opportunities in your inbox after each daily data refresh.
        </p>
        {!prefs?.emailConfigured ? (
          <p className="text-xs text-warning">
            Set RESEND_API_KEY on the server to enable email delivery. Alerts still appear in-app.
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Switch
            id="digest-enabled"
            checked={prefs?.enabled ?? false}
            onCheckedChange={(enabled) =>
              updatePrefs.mutate({
                enabled,
                region: prefs?.region ?? region,
                category: category ?? prefs?.category ?? null,
              })
            }
            disabled={updatePrefs.isPending}
          />
          <Label htmlFor="digest-enabled" className="text-sm cursor-pointer">
            Send daily digest to my account email
          </Label>
        </div>
        {onCategoryChange ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Digest category filter</Label>
            <Select
              value={category ?? "all"}
              onValueChange={(v) => {
                const next = v === "all" ? undefined : v;
                onCategoryChange(next);
                if (prefs?.enabled) {
                  updatePrefs.mutate({
                    enabled: true,
                    region: prefs.region ?? region,
                    category: next ?? null,
                  });
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoriesQuery.data?.categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {prefs?.lastSentAt ? (
          <p className="text-[10px] text-muted-foreground">
            Last digest sent {new Date(prefs.lastSentAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {alertsQuery.data && alertsQuery.data.length > 0 ? (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Recent in-app alerts
          </p>
          <ul className="space-y-1.5">
            {alertsQuery.data.slice(0, 5).map((a) => {
              const meta = a.metadata;
              const kw = typeof meta?.keyword === "string" ? meta.keyword : "keyword";
              return (
                <li
                  key={a.id}
                  className="text-xs flex items-center gap-2 text-muted-foreground"
                >
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    Rising
                  </Badge>
                  <span className="capitalize truncate">{kw}</span>
                  <span className="shrink-0 ml-auto">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
