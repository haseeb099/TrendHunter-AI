import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminUserPanel } from "@/components/admin/AdminUserPanel";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useAdminOverview } from "@/contexts/AdminOverviewContext";
import { trpc } from "@/lib/trpc";
import type { AccountStatus } from "@shared/adminTypes";
import type { PlanId } from "@shared/plans";
import {
  Users,
  Search,
  UserX,
  RefreshCw,
  UserPlus,
  Download,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLANS: PlanId[] = ["trial", "starter", "pro", "business", "agency"];

export default function AdminDashboard() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<PlanId | "all">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCreateUser, setShowCreateUser] = useState(false);

  const overview = useAdminOverview();
  const usersQuery = trpc.admin.listUsers.useQuery({
    search: search || undefined,
    accountStatus: statusFilter === "all" ? undefined : statusFilter,
    planId: planFilter === "all" ? undefined : planFilter,
    role: roleFilter === "all" ? undefined : roleFilter,
    page,
    pageSize: 20,
  });

  const exportUsers = trpc.admin.exportUsers.useQuery(undefined, { enabled: false });

  const bulkAction = trpc.admin.bulkQuickAction.useMutation({
    onSuccess: async (res) => {
      setSelectedIds(new Set());
      await utils.admin.listUsers.invalidate();
      await utils.admin.getOverview.invalidate();
      toast.success(`Updated ${res.updated} users`);
    },
    onError: (e) => toast.error(e.message),
  });

  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: async () => {
      setShowCreateUser(false);
      await utils.admin.listUsers.invalidate();
      await utils.admin.getOverview.invalidate();
      toast.success("User created");
    },
    onError: (e) => toast.error(e.message),
  });

  const detailQuery = trpc.admin.getUserDetail.useQuery(
    { userId: selectedUserId! },
    { enabled: selectedUserId !== null }
  );

  const quickAction = trpc.admin.quickAction.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      if (selectedUserId) await utils.admin.getUserDetail.invalidate({ userId: selectedUserId });
      toast.success("Account updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      if (selectedUserId) await utils.admin.getUserDetail.invalidate({ userId: selectedUserId });
      toast.success("User saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.admin.resetPassword.useMutation({
    onSuccess: () => toast.success("Password reset"),
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      setSelectedUserId(null);
      await utils.admin.listUsers.invalidate();
      await utils.admin.getOverview.invalidate();
      toast.success("User removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((usersQuery.data?.total ?? 0) / 20));
  const pageUserIds = usersQuery.data?.users.map((u) => u.id) ?? [];
  const allPageSelected =
    pageUserIds.length > 0 && pageUserIds.every((id) => selectedIds.has(id));

  const handleExport = async () => {
    const result = await exportUsers.refetch();
    const rows = result.data ?? [];
    const header = "id,name,email,role,plan,status,account_status,created,last_signed_in";
    const csv = [
      header,
      ...rows.map((r) =>
        [
          r.id,
          `"${(r.name ?? "").replace(/"/g, '""')}"`,
          r.email ?? "",
          r.role,
          r.planId,
          r.planStatus,
          r.accountStatus,
          new Date(r.createdAt).toISOString(),
          new Date(r.lastSignedIn).toISOString(),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} users`);
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageUserIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...Array.from(prev), ...pageUserIds]));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 admin-stagger">
        <AdminPageHeader
          title="Users & support"
          description="Search accounts, resolve issues, override limits, and take bulk actions across your customer base."
          icon={Users}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exportUsers.isFetching}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button size="sm" onClick={() => setShowCreateUser(true)}>
                <UserPlus className="w-4 h-4" />
                Create user
              </Button>
            </>
          }
        />

        {overview.isError ? (
          <AdminEmptyState
            title="Could not load overview metrics"
            description={overview.error?.message ?? "Unknown error"}
          />
        ) : overview.data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <AdminMetricCard label="Total" value={overview.data.totalUsers} icon={Users} />
            <AdminMetricCard label="Active" value={overview.data.activeUsers} tone="success" />
            <AdminMetricCard label="Active 7d" value={overview.data.activeUsers7d} />
            <AdminMetricCard label="Signups" value={overview.data.newSignupsToday} hint="today" tone="success" />
            <AdminMetricCard label="On trial" value={overview.data.trialUsers} />
            <AdminMetricCard label="Paid" value={overview.data.paidUsers} />
            <AdminMetricCard label="Searches" value={overview.data.searchesToday} icon={Search} hint="today" />
            <AdminMetricCard label="AI calls" value={overview.data.aiCallsToday} hint="today" />
          </div>
        ) : null}

        <div className="admin-toolbar space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by email or name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-elegant flex-1"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as AccountStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40 input-elegant">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={planFilter}
              onValueChange={(v) => {
                setPlanFilter(v as PlanId | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36 input-elegant">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v as "all" | "user" | "admin");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-32 input-elegant">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => usersQuery.refetch()}
              disabled={usersQuery.isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", usersQuery.isFetching && "animate-spin")} />
            </Button>
          </div>

          {selectedIds.size > 0 ? (
            <div className="admin-bulk-bar">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkAction.isPending}
                onClick={() => bulkAction.mutate({ userIds: Array.from(selectedIds), action: "activate" })}
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkAction.isPending}
                onClick={() => bulkAction.mutate({ userIds: Array.from(selectedIds), action: "pause" })}
              >
                Pause
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkAction.isPending}
                onClick={() => bulkAction.mutate({ userIds: Array.from(selectedIds), action: "flag", flagReason: "Bulk review" })}
              >
                Flag
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={bulkAction.isPending}
                onClick={() => bulkAction.mutate({ userIds: Array.from(selectedIds), action: "deactivate" })}
              >
                Deactivate
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          ) : null}

          {usersQuery.isLoading ? (
            <AdminLoading label="Loading users…" />
          ) : usersQuery.isError ? (
            <AdminEmptyState
              title="Could not load users"
              description={usersQuery.error.message}
            />
          ) : (usersQuery.data?.users.length ?? 0) === 0 ? (
            <AdminEmptyState
              icon={Users}
              title="No users match your filters"
              description="Try clearing filters or broadening your search."
            />
          ) : (
            <>
              <div className="admin-table-shell overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Searches</TableHead>
                      <TableHead>Last seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersQuery.data?.users.map((u) => (
                      <TableRow
                        key={u.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(u.id)}
                            onCheckedChange={(checked) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(u.id);
                                else next.delete(u.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate flex items-center gap-1.5">
                              {u.name ?? "—"}
                              {u.role === "admin" ? (
                                <Shield className="w-3 h-3 text-primary shrink-0" />
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{u.planId}</span>
                          {u.isTrial && u.daysLeftInTrial !== null ? (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({u.daysLeftInTrial}d)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge status={u.accountStatus} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {u.searchesThisMonth}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(u.lastSignedIn).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {usersQuery.data?.total ?? 0} users · page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CreateUserDialog
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreate={(data) => createUser.mutate(data)}
        pending={createUser.isPending}
      />

      <AdminUserPanel
        open={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
        detail={detailQuery.data}
        loading={detailQuery.isLoading}
        onQuickAction={(action, flagReason) => {
          if (!selectedUserId) return;
          quickAction.mutate({ userId: selectedUserId, action, flagReason });
        }}
        onUpdate={(data) => {
          if (!selectedUserId) return;
          updateUser.mutate({ userId: selectedUserId, ...data });
        }}
        onDelete={() => {
          if (!selectedUserId) return;
          if (confirm("Permanently delete this user and all their data?")) {
            deleteUser.mutate({ userId: selectedUserId });
          }
        }}
        onResetPassword={(password) => {
          if (!selectedUserId) return;
          resetPassword.mutate({ userId: selectedUserId, newPassword: password });
        }}
        pending={
          quickAction.isPending ||
          updateUser.isPending ||
          deleteUser.isPending ||
          resetPassword.isPending
        }
      />
    </AdminLayout>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreate,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    email: string;
    password: string;
    name?: string;
    planId: PlanId;
    role: "user" | "admin";
    startTrial: boolean;
  }) => void;
  pending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState<PlanId>("trial");
  const [role, setRole] = useState<"user" | "admin">("user");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create user account</DialogTitle>
          <p className="text-sm text-muted-foreground">Manually provision a customer or admin account.</p>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="input-elegant h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Password (min 8)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-elegant h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="input-elegant h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Plan</Label>
              <Select value={planId} onValueChange={(v) => setPlanId(v as PlanId)}>
                <SelectTrigger className="input-elegant h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
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
          </div>
          <Button
            className="w-full"
            disabled={pending || !email || password.length < 8}
            onClick={() =>
              onCreate({
                email,
                password,
                name: name || undefined,
                planId,
                role,
                startTrial: planId === "trial",
              })
            }
          >
            {pending ? <Spinner className="w-4 h-4" /> : "Create account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
