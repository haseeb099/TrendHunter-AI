import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";

export default function ProductPipeline() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Product Pipeline</h1>
        <p className="text-muted-foreground">Track products through testing, scaling, and beyond</p>
      </div>
      <Card className="card-elevated p-12 text-center">
        <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Product pipeline coming soon</p>
      </Card>
    </div>
  );
}
