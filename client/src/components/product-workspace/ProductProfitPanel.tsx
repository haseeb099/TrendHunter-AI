import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, Save } from "lucide-react";
import {
  calculatePlatformFee,
  getPlatformFeeBreakdown,
  PLATFORM_FEE_TABLE,
  SELLING_PLATFORMS,
  type SellingPlatform,
} from "@shared/platformFees";
import type { SupplierMatchState } from "@shared/searchTypes";

type ProductProfitPanelProps = {
  productTitle: string;
  productCost?: number;
  shippingCost?: number;
  sellingPrice?: number;
  category?: string;
  supplierMatchState?: SupplierMatchState;
  approximatePrice?: boolean;
  dataLabel?: string;
};

export function ProductProfitPanel({
  productTitle,
  productCost = 0,
  shippingCost = 0,
  sellingPrice = 0,
  category,
  supplierMatchState,
  approximatePrice = false,
  dataLabel,
}: ProductProfitPanelProps) {
  const [cost, setCost] = useState(productCost);
  const [ship, setShip] = useState(shippingCost);
  const [platform, setPlatform] = useState<SellingPlatform>("amazon");
  const [platformFee, setPlatformFee] = useState(0);
  const [platformFeeManual, setPlatformFeeManual] = useState(false);
  const [adSpend, setAdSpend] = useState(0);
  const [vat, setVat] = useState(0);
  const [sell, setSell] = useState(sellingPrice);

  useEffect(() => {
    setCost(productCost);
    setShip(shippingCost);
    setSell(sellingPrice);
  }, [productCost, shippingCost, sellingPrice, productTitle]);

  useEffect(() => {
    if (platformFeeManual) return;
    setPlatformFee(calculatePlatformFee(sell, platform, category));
  }, [sell, platform, category, platformFeeManual]);

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
  const feeBreakdown = getPlatformFeeBreakdown(sell, platform, category);

  if (supplierMatchState === "none") {
    return (
      <div className="space-y-3">
        {dataLabel ? <p className="text-xs text-muted-foreground">{dataLabel}</p> : null}
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No supplier data — add your own costs or search suppliers manually.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dataLabel ? <p className="text-xs text-muted-foreground">{dataLabel}</p> : null}
      {approximatePrice ? (
        <p className="text-xs text-warning rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          Estimated — supplier price is approximate. Verify landed cost before ordering.
        </p>
      ) : null}

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

      <div className="space-y-1.5">
        <Label className="text-xs">Selling platform</Label>
        <Select
          value={platform}
          onValueChange={(v) => {
            setPlatform(v as SellingPlatform);
            setPlatformFeeManual(false);
          }}
        >
          <SelectTrigger className="input-elegant h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SELLING_PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {PLATFORM_FEE_TABLE[platform].notes ? (
          <p className="text-[10px] text-muted-foreground">{PLATFORM_FEE_TABLE[platform].notes}</p>
        ) : null}
        {sell > 0 && feeBreakdown.total > 0 ? (
          <ul className="text-[10px] text-muted-foreground space-y-0.5 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
            <li className="flex justify-between gap-2">
              <span>Referral ({Math.round(feeBreakdown.referralRate * 100)}%)</span>
              <span className="tabular-nums">${feeBreakdown.referralFee.toFixed(2)}</span>
            </li>
            {feeBreakdown.flatFee > 0 ? (
              <li className="flex justify-between gap-2">
                <span>Per-order fee</span>
                <span className="tabular-nums">${feeBreakdown.flatFee.toFixed(2)}</span>
              </li>
            ) : null}
          </ul>
        ) : null}
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
            onChange={(e) => {
              setPlatformFee(Number(e.target.value));
              setPlatformFeeManual(true);
            }}
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
            platform,
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
