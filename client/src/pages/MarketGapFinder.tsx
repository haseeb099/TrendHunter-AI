import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function MarketGapFinder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Market Gap Finder</h1>
        <p className="text-muted-foreground">Discover underserved niches</p>
      </div>
      <Card className="card-elevated p-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Market gap finder coming soon</p>
      </Card>
    </div>
  );
}
