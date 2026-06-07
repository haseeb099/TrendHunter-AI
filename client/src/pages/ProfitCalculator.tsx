import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";

export default function ProfitCalculator() {
  const [productCost, setProductCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [platformFee, setPlatformFee] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [vatDuties, setVatDuties] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);

  const netProfit = sellingPrice - (productCost + shippingCost + platformFee + adSpend + vatDuties);
  const roi = productCost > 0 ? ((netProfit / productCost) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Profit Calculator</h1>
        <p className="text-muted-foreground">Calculate real profit with full cost breakdown</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-elevated p-6">
          <h3 className="text-xl font-semibold mb-4">Costs</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Product Cost ($)</label>
              <Input
                type="number"
                value={productCost}
                onChange={(e) => setProductCost(Number(e.target.value))}
                className="input-elegant"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Shipping Cost ($)</label>
              <Input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className="input-elegant"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Platform Fee ($)</label>
              <Input
                type="number"
                value={platformFee}
                onChange={(e) => setPlatformFee(Number(e.target.value))}
                className="input-elegant"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Ad Spend ($)</label>
              <Input
                type="number"
                value={adSpend}
                onChange={(e) => setAdSpend(Number(e.target.value))}
                className="input-elegant"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">VAT/Duties ($)</label>
              <Input
                type="number"
                value={vatDuties}
                onChange={(e) => setVatDuties(Number(e.target.value))}
                className="input-elegant"
              />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="card-elevated p-6">
            <h3 className="text-xl font-semibold mb-4">Revenue</h3>
            <div>
              <label className="text-sm font-semibold mb-2 block">Selling Price ($)</label>
              <Input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="input-elegant"
              />
            </div>
          </Card>

          <Card className="card-elevated p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
            <h3 className="text-xl font-semibold mb-4">Results</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Net Profit</span>
                <span className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${netProfit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ROI</span>
                <span className={`text-2xl font-bold ${Number(roi) >= 100 ? "text-green-400" : "text-yellow-400"}`}>
                  {roi}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Margin</span>
                <span className="text-lg font-semibold">
                  {sellingPrice > 0 ? ((netProfit / sellingPrice) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </Card>

          <Button className="btn-primary w-full">
            <DollarSign className="w-4 h-4 mr-2" />
            Save Calculation
          </Button>
        </div>
      </div>
    </div>
  );
}
