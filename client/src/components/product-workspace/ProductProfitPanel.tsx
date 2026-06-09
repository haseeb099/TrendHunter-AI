import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, Save } from "lucide-react";

type ProductProfitPanelProps = {
  productTitle: string;
  productCost?: number;
  shippingCost?: number;
  sellingPrice?: number;
};

export function ProductProfitPanel({
  productTitle,
  productCost = 0,
  shippingCost = 0,
  sellingPrice = 0,
}: ProductProfitPanelProps) {
  const [cost, setCost] = useState(productCost);
  const [ship, setShip] = useState(shippingCost);
  const [platformFee, setPlatformFee] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [vat, setVat] = useState(0);
  const [sell, setSell] = useState(sellingPrice);

  useEffect(() => {
    setCost(productCost);
    setShip(shippingCost);
    setSell(sellingPrice);
  }, [productCost, shippingCost, sellingPrice, productTitle]);

  const utils = trpc.useUtils();
  const saveMutation = trpc.profit.calculateProfit.useMutation({
    onSuccess: async () => {
      await utils.profit.getProfitCalculations.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Profit scenario saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const totalCosts = cost + ship + platformFee + adSpend + vat;
  const netProfit = sell - totalCosts;
  const margin = sell > 0 ? ((netProfit / sell) * 100).toFixed(1) : "0";
  const roi = cost > 0 ? ((netProfit / cost) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <div className="product-profit-summary">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Net profit / unit
          </p>
          <p className={`font-display text-3xl font-bold tabular-nums ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
            ${netProfit.toFixed(2)}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">
            Margin <span className="font-semibold text-foreground">{margin}%</span>
          </p>
          <p className="text-muted-foreground">
            ROI <span className="font-semibold text-foreground">{roi}%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Product cost</Label>
          <Input
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            className="input-elegant h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Shipping</Label>
          <Input
            type="number"
            value={ship}
            onChange={(e) => setShip(Number(e.target.value))}
            className="input-elegant h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Platform fee</Label>
          <Input
            type="number"
            value={platformFee}
            onChange={(e) => setPlatformFee(Number(e.target.value))}
            className="input-elegant h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ad spend</Label>
          <Input
            type="number"
            value={adSpend}
            onChange={(e) => setAdSpend(Number(e.target.value))}
            className="input-elegant h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">VAT / duties</Label>
          <Input
            type="number"
            value={vat}
            onChange={(e) => setVat(Number(e.target.value))}
            className="input-elegant h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Selling price</Label>
          <Input
            type="number"
            value={sell}
            onChange={(e) => setSell(Number(e.target.value))}
            className="input-elegant h-9"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm rounded-lg border border-border bg-muted/30 px-3 py-2">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Total costs
        </span>
        <span className="font-semibold tabular-nums">${totalCosts.toFixed(2)}</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={saveMutation.isPending}
        onClick={() =>
          saveMutation.mutate({
            productTitle,
            productCost: cost,
            shippingCost: ship,
            platformFee,
            adSpend,
            vatDuties: vat,
            sellingPrice: sell,
          })
        }
      >
        {saveMutation.isPending ? (
          <Spinner className="w-4 h-4 mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Save scenario
      </Button>
    </div>
  );
}
