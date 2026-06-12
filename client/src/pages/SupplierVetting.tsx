import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  MapPin,
  Clock,
  Package,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Truck,
  ExternalLink,
  LayoutGrid,
  Users,
} from "lucide-react";
import { PRODUCT_CATEGORIES } from "@shared/searchTypes";
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

  const [view, setView] = useState<"directory" | "contacts">("directory");
  const [catalogCategory, setCatalogCategory] = useState<string | undefined>();

  const suppliersQuery = trpc.supplier.getSuppliers.useQuery();
  const offersStatus = trpc.supplier.getOffersStatus.useQuery();
  const catalogQuery = trpc.supplier.getCatalog.useQuery({ category: catalogCategory });

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
        title="Suppliers"
        description="Browse CJ and AliExpress category coverage, or track contacts you vet manually."
        actions={
          view === "contacts" ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Add supplier
            </Button>
          ) : null
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="directory" className="gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            My suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-6 space-y-4">
          {offersStatus.isLoading ? (
            <div className="card-elevated p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="w-4 h-4" />
              Checking supplier API status…
            </div>
          ) : offersStatus.data ? (
            <div className="card-elevated p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={offersStatus.data.cj.configured ? "secondary" : "outline"}
                  className="gap-1.5 py-1"
                >
                  <Truck className="w-3 h-3" />
                  CJ: {offersStatus.data.cj.configured ? "live API" : "catalog only"}
                </Badge>
                <Badge
                  variant={offersStatus.data.aliexpress.configured ? "secondary" : "outline"}
                  className="gap-1.5 py-1"
                >
                  <Truck className="w-3 h-3" />
                  AliExpress:{" "}
                  {offersStatus.data.aliexpress.configured ? "live API" : "catalog only"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {offersStatus.data.cj.configured ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`${getDashboardPath("search")}?platform=cj&live=true`}>
                      Search CJ in Discover
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                ) : null}
                {offersStatus.data.aliexpress.configured ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`${getDashboardPath("search")}?platform=aliexpress&live=true`}>
                      Search AliExpress in Discover
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                ) : null}
              </div>
              {!offersStatus.data.cj.configured && !offersStatus.data.aliexpress.configured ? (
                <p className="text-xs text-muted-foreground">
                  Add CJ or AliExpress API keys to enable live product discovery from the supplier
                  directory.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={!catalogCategory ? "default" : "outline"}
              onClick={() => setCatalogCategory(undefined)}
            >
              All
            </Button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={catalogCategory === cat ? "default" : "outline"}
                onClick={() => setCatalogCategory(cat)}
                className="capitalize"
              >
                {cat}
              </Button>
            ))}
          </div>

          {catalogQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : catalogQuery.data && catalogQuery.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalogQuery.data.map((entry) => (
                <article key={entry.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium capitalize">{entry.platform}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {entry.category}
                        {entry.subcategory ? ` · ${entry.subcategory}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{entry.coverageScore}% coverage</Badge>
                  </div>
                  {entry.notes ? (
                    <p className="text-xs text-muted-foreground mb-3">{entry.notes}</p>
                  ) : null}
                  {entry.searchUrl ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={entry.searchUrl} target="_blank" rel="noopener noreferrer">
                        Browse catalog
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No catalog entries"
              description="Run the supplier_catalog migration to seed CJ and AliExpress category rows."
            />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-6 space-y-4">
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

        </TabsContent>
      </Tabs>

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
