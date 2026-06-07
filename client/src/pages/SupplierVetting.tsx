import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Clock, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function SupplierVetting() {
  const suppliersQuery = trpc.supplier.getSuppliers.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Supplier Vetting</h1>
        <p className="text-muted-foreground">Evaluate and track supplier reliability and performance</p>
      </div>

      {suppliersQuery.data && suppliersQuery.data.length > 0 ? (
        <div className="grid gap-4">
          {suppliersQuery.data.map((supplier) => (
            <Card key={supplier.id} className="card-elevated p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{supplier.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {supplier.country || 'Unknown'}
                  </div>
                </div>
                <Badge className={(supplier.reliabilityScore ?? 0) >= 80 ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}>
                  {supplier.reliabilityScore ?? 0}% Reliable
                </Badge>
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
                    {supplier.moq} units
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Platform</p>
                  <p className="font-semibold">{supplier.platform || 'Multi'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  <p className="font-semibold text-green-400">Active</p>
                </div>
              </div>

              {supplier.notes && <p className="text-sm text-muted-foreground">{supplier.notes}</p>}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-elevated p-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No suppliers added yet</p>
        </Card>
      )}
    </div>
  );
}
