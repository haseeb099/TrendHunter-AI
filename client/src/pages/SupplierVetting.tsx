import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { MapPin, Clock, Package, Plus, Pencil, Trash2, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export default function SupplierVetting() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier contacts"
        description="Track suppliers you vet manually. Live CJ & AliExpress offers appear on product detail in Search."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add supplier
          </Button>
        }
      />

      {offersStatus.data ? (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">
            CJ: {offersStatus.data.cj.mode}
          </Badge>
          <Badge variant="outline">
            AliExpress: {offersStatus.data.aliexpress.mode}
          </Badge>
        </div>
      ) : null}

      {suppliersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-8 h-8" />
        </div>
      ) : suppliersQuery.data && suppliersQuery.data.length > 0 ? (
        <div className="grid gap-4">
          {suppliersQuery.data.map((supplier) => (
            <Card key={supplier.id} className="card-elevated p-6">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{supplier.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {supplier.country || "Unknown"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {supplier.reliabilityScore != null && supplier.reliabilityScore > 0 ? (
                    <Badge
                      className={
                        supplier.reliabilityScore >= 80
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }
                    >
                      {supplier.reliabilityScore}% Reliable
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

              <div className="grid md:grid-cols-4 gap-4 mb-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Shipping Time</p>
                  <div className="flex items-center gap-1 font-semibold">
                    <Clock className="w-4 h-4" />
                    {supplier.shippingDaysMin ?? 0}-{supplier.shippingDaysMax ?? 0} days
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">MOQ</p>
                  <div className="flex items-center gap-1 font-semibold">
                    <Package className="w-4 h-4" />
                    {supplier.moq ?? "—"} units
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Platform</p>
                  <p className="font-semibold">{supplier.platform || "Multi"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sample</p>
                  <p className="font-semibold">
                    {supplier.sampleOrdered ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Ordered
                      </span>
                    ) : (
                      "Not ordered"
                    )}
                  </p>
                </div>
              </div>

              {supplier.notes && <p className="text-sm text-muted-foreground mb-4">{supplier.notes}</p>}

              {!supplier.sampleOrdered ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => vetMutation.mutate({ supplierId: supplier.id })}
                  disabled={vetMutation.isPending}
                >
                  Order sample
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-elevated p-12 text-center text-muted-foreground">
          No suppliers yet. Add your first supplier to start vetting.
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit supplier" : "Add supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Input value={platform} onChange={(e) => setPlatform(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>MOQ</Label>
              <Input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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
                <Spinner className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
