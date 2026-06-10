import { useEffect, useState } from "react";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  SidePanel,
  SidePanelActionGrid,
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelLoading,
  SidePanelMetrics,
  SidePanelSection,
  SidePanelTabs,
  SidePanelTimeline,
} from "@/components/side-panel/SidePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import type { AccountStatus } from "@shared/adminTypes";
import type { PlanId } from "@shared/plans";
import {
  CalendarPlus,
  Flag,
  KeyRound,
  PauseCircle,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminUserDetail = RouterOutputs["admin"]["getUserDetail"];

const PLANS: PlanId[] = ["trial", "starter", "pro", "business", "agency"];

type AdminUserPanelProps = {
  open: boolean;
  onClose: () => void;
  detail: AdminUserDetail | undefined;
  loading: boolean;
  onQuickAction: (
    action: "activate" | "deactivate" | "flag" | "unflag" | "pause" | "unpause",
    flagReason?: string
  ) => void;
  onUpdate: (data: {
    planId?: PlanId;
    role?: "user" | "admin";
    adminNotes?: string | null;
    limitOverrides?: {
      searchesPerMonth?: number;
      aiCallsPerMonth?: number;
      pipelineItems?: number;
      watchlistItems?: number;
    };
    clearLimitOverrides?: boolean;
    extendTrialDays?: number;
    extendPlanDays?: number;
    resetTrialEligibility?: boolean;
    grantFreshTrial?: boolean;
    expirePlanNow?: boolean;
  }) => void;
  onDelete: () => void;
  onResetPassword: (password: string) => void;
  pending: boolean;
};

type DetailTab = "overview" | "manage" | "history";

export function AdminUserPanel({
  open,
  onClose,
  detail,
  loading,
  onQuickAction,
  onUpdate,
  onDelete,
  onResetPassword,
  pending,
}: AdminUserPanelProps) {
  const [notes, setNotes] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [searchLimit, setSearchLimit] = useState("");
  const [aiLimit, setAiLimit] = useState("");
  const [pipelineLimit, setPipelineLimit] = useState("");
  const [watchlistLimit, setWatchlistLimit] = useState("");
  const [extendDays, setExtendDays] = useState("7");
  const [planId, setPlanId] = useState<PlanId>("starter");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [newPassword, setNewPassword] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const user = detail?.user;
  const sub = detail?.subscription;

  useEffect(() => {
    if (!open) setDetailTab("overview");
  }, [open]);

  useEffect(() => {
    if (!detail) return;
    setNotes(detail.user.adminNotes ?? "");
    setFlagReason(detail.user.flagReason ?? "");
    setPlanId(detail.user.planId as PlanId);
    setRole(detail.user.role);
    const o = detail.user.limitOverrides;
    setSearchLimit(o?.searchesPerMonth?.toString() ?? "");
    setAiLimit(o?.aiCallsPerMonth?.toString() ?? "");
    setPipelineLimit(o?.pipelineItems?.toString() ?? "");
    setWatchlistLimit(o?.watchlistItems?.toString() ?? "");
  }, [detail]);

  const headerBadges =
    !loading && user ? (
      <>
        <AdminStatusBadge status={user.accountStatus as AccountStatus} />
        <Badge variant="outline" className="capitalize">
          {user.planId}
        </Badge>
        {user.role === "admin" ? (
          <Badge className="gap-1">
            <Shield className="w-3 h-3" />
            Admin
          </Badge>
        ) : null}
        {sub?.isTrial ? (
          <Badge variant="outline">Trial · {sub.daysLeftInTrial}d left</Badge>
        ) : null}
      </>
    ) : null;

  return (
    <SidePanel open={open} onOpenChange={(o) => !o && onClose()}>
      <SidePanelContent size="lg" onClose={onClose}>
        <SidePanelHeader
          title={loading ? "Loading…" : (user?.name ?? user?.email ?? "User")}
          subtitle={!loading && user?.email ? user.email : undefined}
          avatarLabel={user?.name ?? user?.email ?? undefined}
          badges={headerBadges}
          loading={loading}
          meta={
            !loading && user ? (
              <>
                Joined {new Date(user.createdAt).toLocaleDateString()}
                {" · "}
                Last sign-in {new Date(user.lastSignedIn).toLocaleString()}
              </>
            ) : undefined
          }
        />

        {!loading && detail && user ? (
          <SidePanelTabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "manage", label: "Manage" },
              { id: "history", label: "History" },
            ]}
            active={detailTab}
            onChange={setDetailTab}
          />
        ) : null}

        {loading || !detail || !user ? (
          <SidePanelLoading label="Loading user profile…" />
        ) : (
          <>
            {detailTab === "overview" ? (
              <SidePanelBody>
                <SidePanelMetrics
                  items={[
                    {
                      label: "Searches / mo",
                      value: `${sub?.usage.searchesThisMonth ?? 0} / ${sub?.limits.searchesPerMonth ?? "—"}`,
                      icon: Search,
                    },
                    {
                      label: "AI calls / mo",
                      value: `${sub?.usage.aiCallsThisMonth ?? 0} / ${sub?.limits.aiCallsPerMonth ?? "—"}`,
                      icon: Sparkles,
                    },
                    {
                      label: "Pipeline items",
                      value: String(sub?.usage.pipelineItems ?? 0),
                    },
                    {
                      label: "Watchlist items",
                      value: String(sub?.usage.watchlistItems ?? 0),
                    },
                  ]}
                />

                <p className="text-xs text-muted-foreground">
                  {user.hasUsedTrial ? "Trial already used" : "Trial still available"}
                </p>

                {detail.couponHistory.length > 0 ? (
                  <SidePanelSection title="Coupons redeemed">
                    <ul className="space-y-2">
                      {detail.couponHistory.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="font-mono text-foreground">{c.code}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {new Date(c.redeemedAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </SidePanelSection>
                ) : null}

                <SidePanelSection
                  title="Account actions"
                  description="Quick status changes without opening the full manage form."
                >
                  <SidePanelActionGrid>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => onQuickAction("activate")}>
                      Activate
                    </Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => onQuickAction("pause")}>
                      <PauseCircle className="w-3.5 h-3.5" />
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => onQuickAction("unpause")}>
                      Unpause
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onQuickAction("flag", flagReason || "Review required")}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Flag
                    </Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => onQuickAction("unflag")}>
                      Unflag
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => onQuickAction("deactivate")}
                    >
                      Deactivate
                    </Button>
                  </SidePanelActionGrid>
                </SidePanelSection>
              </SidePanelBody>
            ) : null}

            {detailTab === "manage" ? (
              <>
                <SidePanelBody>
                  <SidePanelSection title="Plan & limits" description="Subscription tier and per-user overrides.">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Plan</Label>
                        <Select value={planId} onValueChange={(v) => setPlanId(v as PlanId)}>
                          <SelectTrigger className="input-elegant h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLANS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Role</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as "user" | "admin")}>
                          <SelectTrigger className="input-elegant h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Extend trial (days)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={extendDays}
                            onChange={(e) => setExtendDays(e.target.value)}
                            className="input-elegant h-9"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              onUpdate({ extendTrialDays: Number(extendDays), planId: "trial" })
                            }
                          >
                            <CalendarPlus className="w-4 h-4" />
                            Extend
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Search limit</Label>
                        <Input
                          type="number"
                          placeholder="-1 = unlimited"
                          value={searchLimit}
                          onChange={(e) => setSearchLimit(e.target.value)}
                          className="input-elegant h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">AI limit</Label>
                        <Input
                          type="number"
                          placeholder="-1 = unlimited"
                          value={aiLimit}
                          onChange={(e) => setAiLimit(e.target.value)}
                          className="input-elegant h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Pipeline limit</Label>
                        <Input
                          type="number"
                          value={pipelineLimit}
                          onChange={(e) => setPipelineLimit(e.target.value)}
                          className="input-elegant h-9"
                          placeholder="-1 = unlimited"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Watchlist limit</Label>
                        <Input
                          type="number"
                          value={watchlistLimit}
                          onChange={(e) => setWatchlistLimit(e.target.value)}
                          className="input-elegant h-9"
                        />
                      </div>
                    </div>
                  </SidePanelSection>

                  <SidePanelSection title="Notes & moderation">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Flag reason</Label>
                        <Input
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                          className="input-elegant h-9"
                          placeholder="Shown when flagging this account"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Internal support notes</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          className="input-elegant resize-none text-sm"
                          placeholder="Visible only to admins"
                        />
                      </div>
                    </div>
                  </SidePanelSection>

                  <SidePanelSection title="Plan utilities">
                    <SidePanelActionGrid>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onUpdate({ clearLimitOverrides: true })}
                      >
                        Reset limits
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onUpdate({ resetTrialEligibility: true })}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset trial eligibility
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onUpdate({ grantFreshTrial: true })}
                      >
                        Grant fresh trial
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onUpdate({ expirePlanNow: true })}
                      >
                        Expire plan now
                      </Button>
                    </SidePanelActionGrid>
                  </SidePanelSection>

                  <SidePanelSection title="Reset password" description="Set a new password for this user.">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 8 characters)"
                        className="input-elegant h-9 flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={pending || newPassword.length < 8}
                        onClick={() => {
                          onResetPassword(newPassword);
                          setNewPassword("");
                        }}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Set password
                      </Button>
                    </div>
                  </SidePanelSection>
                </SidePanelBody>

                <SidePanelFooter>
                  <Button
                    disabled={pending}
                    onClick={() =>
                      onUpdate({
                        planId,
                        role,
                        adminNotes: notes || null,
                        limitOverrides: {
                          ...(searchLimit !== ""
                            ? { searchesPerMonth: Number(searchLimit) }
                            : {}),
                          ...(aiLimit !== "" ? { aiCallsPerMonth: Number(aiLimit) } : {}),
                          ...(pipelineLimit !== ""
                            ? { pipelineItems: Number(pipelineLimit) }
                            : {}),
                          ...(watchlistLimit !== ""
                            ? { watchlistItems: Number(watchlistLimit) }
                            : {}),
                        },
                        extendPlanDays: user.planId !== "trial" ? Number(extendDays) : undefined,
                      })
                    }
                  >
                    {pending ? <Spinner className="w-4 h-4" /> : "Save changes"}
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                </SidePanelFooter>
              </>
            ) : null}

            {detailTab === "history" ? (
              <>
                <SidePanelBody>
                  <SidePanelSection
                    title="Recent searches"
                    description={`${detail.searchHistory.length} recorded`}
                  >
                    <SidePanelTimeline
                      items={detail.searchHistory.map((s) => ({
                        id: `${s.source}-${s.id}`,
                        title: s.query,
                        subtitle: s.source,
                        time: new Date(s.createdAt).toLocaleString(),
                      }))}
                    />
                  </SidePanelSection>

                  {detail.auditLog.length > 0 ? (
                    <SidePanelSection title="Admin audit log">
                      <SidePanelTimeline
                        items={detail.auditLog.map((a) => ({
                          id: a.id,
                          title: a.action,
                          subtitle: a.adminEmail ?? `admin#${a.adminUserId}`,
                          time: new Date(a.createdAt).toLocaleString(),
                        }))}
                      />
                    </SidePanelSection>
                  ) : null}
                </SidePanelBody>

                <SidePanelFooter>
                  <Button variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
                    <Trash2 className="w-4 h-4" />
                    Delete user permanently
                  </Button>
                </SidePanelFooter>
              </>
            ) : null}
          </>
        )}
      </SidePanelContent>
    </SidePanel>
  );
}
