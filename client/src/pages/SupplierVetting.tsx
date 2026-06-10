import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import { getDashboardPath } from "@/config/dashboardNav";
import { MapPin, Clock, Package, Plus, Pencil, Trash2, CheckCircle, Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

function reliabilityBadgeClass(score: number): string {
  if (score >= 80) return "bg-success/10 text-success border-success/20";
  if (score >= 50) return "bg-warning/10 text-warning border-warning/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

export default function SupplierVetting() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [platform, setPlatform] = useState("");
  const [moq, setMoq] = useState("");
  const [notes, setNotes] = useState("");

  const suppliersQuery = trpc.supplier.getSuppliers.useQuery();
  const offersStatus = trpc.supplier.getOffersStatus.useQuery();

  const createMutation = trpc.supplier.createSupplier.useMutation({
    onSuccess: async () => {
      await utils.supplier.getSuppliers.invalidate();
      toast.success("Supplier created");
      resetForm();
    },
  });
  const updateMutation = trpc.supplier.updateSupplier.useMutation({
    onSuccess: async () => {
      await utils.supplier.getSuppliers.invalidate();
      toast.success("Supplier updated");
      resetForm();
    },
  });
  const deleteMutation = trpc.supplier.deleteSupplier.useMutation({
    onSuccess: async () => {
      await utils.supplier.getSuppliers.invalidate();
      toast.success("Supplier deleted");
    },
  });
  const vetMutation = trpc.supplier.vetSupplier.useMutation({
    onSuccess: async () => {
      await utils.supplier.getSuppliers.invalidate();
      toast.success("Sample order marked");
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setName("");
    setCountry("");
    setPlatform("");
    setMoq("");
    setNotes("");
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (supplier: NonNullable<typeof suppliersQuery.data>[number]) => {
    setEditingId(supplier.id);
    setName(supplier.name);
    setCountry(supplier.country ?? "");
    setPlatform(supplier.platform ?? "");
    setMoq(supplier.moq?.toString() ?? "");
    setNotes(supplier.notes ?? "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      name: name.trim(),
      country: country || undefined,
      platform: platform || undefined,
      moq: moq ? Number(moq) : undefined,
      notes: notes || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const supplierCount = suppliersQuery.data?.length ?? 0;
  const vettedCount = suppliersQuery.data?.filter((s) => s.sampleOrdered).length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Supplier contacts"
        description="Track suppliers you vet manually. Live CJ and AliExpress offers appear on product detail in Discover."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Add supplier
          </Button>
        }
      />

      {offersStatus.data ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1">
            <Truck className="w-3 h-3" />
            CJ: {offersStatus.data.cj.mode}
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1">
            <Truck className="w-3 h-3" />
            AliExpress: {offersStatus.data.aliexpress.mode}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {supplierCount} contacts · {vettedCount} samples ordered
          </span>
        </div>
      ) : null}

      {suppliersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-8 h-8" />
        </div>
      ) : suppliersQuery.data && suppliersQuery.data.length > 0 ? (
        <div className="grid gap-4">
          {suppliersQuery.data.map((supplier) => (
            <article key={supplier.id} className="card-elevated p-5 sm:p-6">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold truncate">{supplier.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {supplier.country || "Unknown region"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {supplier.reliabilityScore != null && supplier.reliabilityScore > 0 ? (
                    <Badge className={reliabilityBadgeClass(supplier.reliabilityScore)}>
                      {supplier.reliabilityScore}% reliable
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not scored</Badge>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(supplier)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate({ id: supplier.id })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="product-metric-tile">
                  <p className="metric-label mb-1">Shipping</p>
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {supplier.shippingDaysMin ?? 0}–{supplier.shippingDaysMax ?? 0} days
                  </div>
                </div>
                <div className="product-metric-tile">
                  <p className="metric-label mb-1">MOQ</p>
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    {supplier.moq ?? "—"} units
                  </div>
                </div>
                <div className="product-metric-tile">
                  <p className="metric-label mb-1">Platform</p>
                  <p className="font-semibold text-sm">{supplier.platform || "Multi-channel"}</p>
                </div>
                <div className="product-metric-tile">
                  <p className="metric-label mb-1">Sample</p>
                  <p
                    className={cn(
                      "font-semibold text-sm flex items-center gap-1",
                      supplier.sampleOrdered ? "text-success" : "text-muted-foreground"
                    )}
                  >
                    {supplier.sampleOrdered ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Ordered
                      </>
                    ) : (
                      "Not ordered"
                    )}
                  </p>
                </div>
              </div>

              {supplier.notes ? (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{supplier.notes}</p>
              ) : null}

              {!supplier.sampleOrdered ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => vetMutation.mutate({ supplierId: supplier.id })}
                  disabled={vetMutation.isPending}
                >
                  Mark sample ordered
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Truck}
          title="No suppliers yet"
          description="Add contacts you discover on Alibaba, CJ, or trade shows. Live warehouse offers also appear when browsing products in Discover."
          action={{
            label: "Browse Discover",
            onClick: () => setLocation(getDashboardPath("search")),
          }}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit supplier" : "Add supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="input-elegant" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel>Country</FieldLabel>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} className="input-elegant" />
              </div>
              <div className="space-y-2">
                <FieldLabel>Platform</FieldLabel>
                <Input value={platform} onChange={(e) => setPlatform(e.target.value)} className="input-elegant" />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>MOQ</FieldLabel>
              <Input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} className="input-elegant" />
            </div>
            <div className="space-y-2">
              <FieldLabel>Notes</FieldLabel>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-elegant" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Spinner className="w-4 h-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
