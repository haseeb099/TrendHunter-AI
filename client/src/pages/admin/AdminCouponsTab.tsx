import { useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import type { CouponType } from "@shared/adminTypes";
import type { PlanId } from "@shared/plans";
import { Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

const COUPON_TYPES: { value: CouponType; label: string; hint: string }[] = [
  { value: "grant_plan", label: "Grant plan", hint: "Instantly assign a paid plan" },
  { value: "extend_trial", label: "Extend trial", hint: "Value = extra days" },
  { value: "extend_subscription", label: "Extend subscription", hint: "Value = extra days" },
  { value: "bonus_searches", label: "Bonus searches", hint: "Value = extra monthly searches" },
  { value: "discount_percent", label: "Discount %", hint: "Creates Stripe promotion code at checkout" },
];

const PLANS: PlanId[] = ["starter", "pro", "business", "agency"];

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function AdminCouponsTab() {
  const utils = trpc.useUtils();
  const couponsQuery = trpc.admin.listCoupons.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState(randomCode());
  const [description, setDescription] = useState("");
  const [couponType, setCouponType] = useState<CouponType>("extend_trial");
  const [value, setValue] = useState("7");
  const [grantPlanId, setGrantPlanId] = useState<PlanId>("pro");
  const [maxRedemptions, setMaxRedemptions] = useState("-1");

  const createCoupon = trpc.admin.createCoupon.useMutation({
    onSuccess: async () => {
      await utils.admin.listCoupons.invalidate();
      toast.success("Coupon created");
      setShowForm(false);
      setCode(randomCode());
      setDescription("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCoupon = trpc.admin.updateCoupon.useMutation({
    onSuccess: async () => {
      await utils.admin.listCoupons.invalidate();
      toast.success("Coupon updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCoupon = trpc.admin.deleteCoupon.useMutation({
    onSuccess: async () => {
      await utils.admin.listCoupons.invalidate();
      toast.success("Coupon deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 admin-stagger">
      <AdminPageHeader
        title="Coupons & promos"
        description="Generate codes for trials, plan grants, bonus searches, and future checkout discounts."
        icon={Ticket}
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" />
            {showForm ? "Cancel" : "New coupon"}
          </Button>
        }
      />

      {showForm ? (
        <div className="admin-settings-group space-y-4">
          <p className="font-medium text-sm flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Create coupon
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Code</Label>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="input-elegant h-9 font-mono"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setCode(randomCode())}>
                  Random
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={couponType} onValueChange={(v) => setCouponType(v as CouponType)}>
                <SelectTrigger className="input-elegant h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUPON_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                min={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="input-elegant h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                {COUPON_TYPES.find((t) => t.value === couponType)?.hint}
              </p>
            </div>
            {couponType === "grant_plan" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Plan to grant</Label>
                <Select value={grantPlanId} onValueChange={(v) => setGrantPlanId(v as PlanId)}>
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
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs">Max redemptions (-1 = unlimited)</Label>
              <Input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                className="input-elegant h-9"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Description (internal)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-elegant h-9"
                placeholder="e.g. Launch promo for influencers"
              />
            </div>
          </div>
          <Button
            disabled={createCoupon.isPending || !code.trim()}
            onClick={() =>
              createCoupon.mutate({
                code,
                description: description || undefined,
                couponType,
                value: Number(value),
                grantPlanId: couponType === "grant_plan" ? grantPlanId : undefined,
                maxRedemptions: Number(maxRedemptions),
              })
            }
          >
            {createCoupon.isPending ? <Spinner className="w-4 h-4" /> : null}
            Create coupon
          </Button>
        </div>
      ) : null}

      <RedemptionsSection />

      <AdminSection title="All coupons" description="Toggle active status or delete unused codes" icon={Ticket} flush>
        {couponsQuery.isLoading ? (
          <AdminLoading label="Loading coupons…" />
        ) : couponsQuery.isError ? (
          <AdminEmptyState
            title="Could not load coupons"
            description={couponsQuery.error.message}
          />
        ) : (
          <div className="admin-table-shell overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Redemptions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(couponsQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <AdminEmptyState
                        icon={Ticket}
                        title="No coupons yet"
                        description="Create your first promo code to grant plans or extend trials."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  couponsQuery.data?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium text-sm">{c.code}</TableCell>
                      <TableCell className="text-sm capitalize">{c.couponType.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {c.couponType === "grant_plan" ? c.grantPlanId : c.value}
                        {c.couponType === "discount_percent" ? "%" : ""}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {c.redemptionCount}
                        {c.maxRedemptions >= 0 ? ` / ${c.maxRedemptions}` : " / ∞"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.isActive}
                          onCheckedChange={(checked) =>
                            updateCoupon.mutate({ id: c.id, isActive: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Delete coupon ${c.code}?`)) {
                              deleteCoupon.mutate({ id: c.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSection>
    </div>
  );
}

function RedemptionsSection() {
  const redemptions = trpc.admin.listCouponRedemptions.useQuery({ limit: 30 });

  return (
    <AdminSection title="Recent redemptions" description="Who used which coupon and when" icon={Ticket} flush>
      {redemptions.isLoading ? (
        <AdminLoading label="Loading redemptions…" />
      ) : (redemptions.data ?? []).length === 0 ? (
        <AdminEmptyState icon={Ticket} title="No redemptions yet" description="Codes will show up here once customers apply them." />
      ) : (
        <div className="admin-table-shell overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Redeemed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptions.data?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.couponCode}</TableCell>
                    <TableCell className="text-sm">{r.userEmail ?? `#${r.userId}`}</TableCell>
                    <TableCell className="text-xs capitalize">{r.couponType.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.redeemedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminSection>
  );
}
