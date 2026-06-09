import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { Card as HistoryCard } from "@/components/ui/card";
import { DollarSign, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ProfitCalculator() {
  const [location] = useLocation();
  const [productTitle, setProductTitle] = useState("Product");
  const [productCost, setProductCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [platformFee, setPlatformFee] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [vatDuties, setVatDuties] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);

  const utils = trpc.useUtils();
  const historyQuery = trpc.profit.getProfitCalculations.useQuery();
  const deleteMutation = trpc.profit.deleteProfitCalculation.useMutation({
    onSuccess: async () => {
      await utils.profit.getProfitCalculations.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Calculation deleted");
    },
  });
  const saveMutation = trpc.profit.calculateProfit.useMutation({
    onSuccess: async () => {
      await utils.profit.getProfitCalculations.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Calculation saved");
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("productTitle");
    const cost = params.get("productCost");
    const ship = params.get("shippingCost");
    const sell = params.get("sellingPrice");
    if (title) setProductTitle(title);
    if (cost) setProductCost(Number(cost));
    if (ship) setShippingCost(Number(ship));
    if (sell) setSellingPrice(Number(sell));
  }, [location]);

  const netProfit = sellingPrice - (productCost + shippingCost + platformFee + adSpend + vatDuties);
  const roi = productCost > 0 ? ((netProfit / productCost) * 100).toFixed(2) : 0;

  const handleSave = () => {
    saveMutation.mutate({
      productTitle,
      productCost,
      shippingCost,
      platformFee,
      adSpend,
      vatDuties,
      sellingPrice,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit Calculator"
        description="Calculate real profit with full cost breakdown and save scenarios"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-elevated p-6">
          <h3 className="text-xl font-semibold mb-4">Costs</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Product title</label>
              <Input
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                className="input-elegant"
              />
            </div>
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

          <Button className="w-full" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
            Save Calculation
          </Button>
        </div>
      </div>

      {historyQuery.data && historyQuery.data.length > 0 ? (
        <HistoryCard className="card-elevated p-6">
          <h3 className="text-xl font-semibold mb-4">Saved calculations</h3>
          <div className="space-y-3">
            {historyQuery.data.map((calc) => (
              <div
                key={calc.id}
                className="flex items-center justify-between gap-4 border rounded-lg p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{calc.productTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Profit ${(calc.netProfit ?? 0).toFixed(2)} · ROI {(calc.roi ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProductTitle(calc.productTitle);
                      setProductCost(calc.productCost);
                      setShippingCost(calc.shippingCost);
                      setPlatformFee(calc.platformFee);
                      setAdSpend(calc.adSpend);
                      setVatDuties(calc.vatDuties);
                      setSellingPrice(calc.sellingPrice);
                    }}
                  >
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate({ id: calc.id })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </HistoryCard>
      ) : null}
    </div>
  );
}
