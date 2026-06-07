import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function SupplierVetting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Supplier Vetting</h1>
        <p className="text-muted-foreground">Evaluate and track supplier reliability</p>
      </div>
      <Card className="card-elevated p-12 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Supplier vetting dashboard coming soon</p>
      </Card>
    </div>
  );
}
