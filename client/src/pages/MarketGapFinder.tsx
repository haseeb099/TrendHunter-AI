import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, AlertCircle } from "lucide-react";

const gaps = [
  { niche: "Eco-friendly Phone Cases", demand: 8500, supply: 2100, gap: 6400, trend: "rising" },
  { niche: "Wireless Charging Pads", demand: 12000, supply: 8900, gap: 3100, trend: "stable" },
  { niche: "Ergonomic Laptop Stands", demand: 5600, supply: 1200, gap: 4400, trend: "rising" },
  { niche: "Magnetic Phone Mounts", demand: 9800, supply: 7200, gap: 2600, trend: "stable" },
  { niche: "USB-C Cable Organizers", demand: 6200, supply: 800, gap: 5400, trend: "rising" },
];

export default function MarketGapFinder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Market Gap Finder</h1>
        <p className="text-muted-foreground">Discover underserved niches with high demand and low supply</p>
      </div>

      <div className="space-y-4">
        {gaps.map((gap, idx) => (
          <Card key={idx} className="card-elevated p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{gap.niche}</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                    Demand: {gap.demand.toLocaleString()}
                  </Badge>
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                    Supply: {gap.supply.toLocaleString()}
                  </Badge>
                </div>
              </div>
              <Badge className={gap.trend === "rising" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}>
                {gap.trend === "rising" ? <TrendingUp className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {gap.trend}
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Market Gap</p>
              <p className="text-2xl font-bold text-green-400">{gap.gap.toLocaleString()} units</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
