import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { PageHeader } from "@/components/PageHeader";

import { StatCard } from "@/components/StatCard";

import { FormSection } from "@/components/workspace/FormSection";

import { FieldLabel } from "@/components/workspace/FieldLabel";

import { DollarSign, Trash2, TrendingUp, Percent, PiggyBank, Calculator } from "lucide-react";

import { trpc } from "@/lib/trpc";

import { Spinner } from "@/components/ui/spinner";

import { toast } from "sonner";

import { useLocation } from "wouter";

import { cn } from "@/lib/utils";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import {

  calculatePlatformFee,

  getPlatformFeeBreakdown,

  PLATFORM_FEE_TABLE,

  SELLING_PLATFORMS,

  type SellingPlatform,

} from "@shared/platformFees";

import type { SupplierMatchState } from "@shared/searchTypes";

import { useOnboarding } from "@/_core/hooks/useOnboarding";



export default function ProfitCalculator() {

  const [location] = useLocation();

  const [productTitle, setProductTitle] = useState("Product");

  const [productCost, setProductCost] = useState(0);

  const [shippingCost, setShippingCost] = useState(0);

  const [platformFee, setPlatformFee] = useState(0);

  const [adSpend, setAdSpend] = useState(0);

  const [vatDuties, setVatDuties] = useState(0);

  const [sellingPrice, setSellingPrice] = useState(0);

  const [sellingPlatform, setSellingPlatform] = useState<SellingPlatform>("amazon");

  const [platformFeeManual, setPlatformFeeManual] = useState(false);

  const [category, setCategory] = useState<string | undefined>();

  const [supplierMatchState, setSupplierMatchState] = useState<SupplierMatchState | undefined>();

  const [manualEntry, setManualEntry] = useState(false);



  const { completeStep } = useOnboarding();

  const utils = trpc.useUtils();

  const historyQuery = trpc.profit.getProfitCalculations.useQuery();

  const deleteMutation = trpc.profit.deleteProfitCalculation.useMutation({

    onSuccess: async () => {

      await utils.profit.getProfitCalculations.invalidate();

      await utils.analytics.getDashboardMetrics.invalidate();

      toast.success("Calculation removed");

    },

  });

  const saveMutation = trpc.profit.calculateProfit.useMutation({

    onSuccess: async () => {

      await utils.profit.getProfitCalculations.invalidate();

      await utils.analytics.getDashboardMetrics.invalidate();

      completeStep("profit");

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

    const plat = params.get("platform");

    const cat = params.get("category");

    if (plat && plat in PLATFORM_FEE_TABLE) setSellingPlatform(plat as SellingPlatform);

    if (cat) setCategory(cat);

    const match = params.get("supplierMatchState");

    if (match === "exact" || match === "similar" || match === "none") {

      setSupplierMatchState(match);

    }

  }, [location]);



  useEffect(() => {

    if (platformFeeManual) return;

    setPlatformFee(calculatePlatformFee(sellingPrice, sellingPlatform, category));

  }, [sellingPrice, sellingPlatform, category, platformFeeManual]);



  useEffect(() => {

    const hasSupplierData =

      supplierMatchState === "exact" || supplierMatchState === "similar" || manualEntry;

    if (hasSupplierData && productCost > 0 && sellingPrice > 0) {

      completeStep("profit");

    }

  }, [supplierMatchState, manualEntry, productCost, sellingPrice, completeStep]);



  const totalCosts = productCost + shippingCost + platformFee + adSpend + vatDuties;

  const netProfit = sellingPrice - totalCosts;

  const margin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

  const roi = productCost > 0 ? (netProfit / productCost) * 100 : 0;



  const feeBreakdown = useMemo(

    () => getPlatformFeeBreakdown(sellingPrice, sellingPlatform, category),

    [sellingPrice, sellingPlatform, category]

  );



  const costBreakdown = useMemo(

    () =>

      [

        { label: "Product", value: productCost, color: "bg-primary" },

        { label: "Shipping", value: shippingCost, color: "bg-info" },

        { label: "Platform", value: platformFee, color: "bg-warning" },

        { label: "Ads", value: adSpend, color: "bg-accent" },

        { label: "Tax/Duty", value: vatDuties, color: "bg-muted-foreground/40" },

      ].filter((s) => s.value > 0),

    [productCost, shippingCost, platformFee, adSpend, vatDuties]

  );



  const handleSave = () => {

    saveMutation.mutate({

      productTitle,

      productCost,

      shippingCost,

      platformFee,

      adSpend,

      vatDuties,

      sellingPrice,

      platform: sellingPlatform,

    });

  };



  const blockedBySupplier = supplierMatchState === "none" && !manualEntry;



  if (blockedBySupplier) {

    return (

      <div className="space-y-8">

        <PageHeader

          title="Profit Calculator"

          description="Model landed cost, fees, and margin before you commit — same logic used in product detail panels."

        />

        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center space-y-4 max-w-lg mx-auto">

          <Calculator className="w-10 h-10 mx-auto text-muted-foreground/50" />

          <div className="space-y-2">

            <p className="font-medium">No supplier match</p>

            <p className="text-sm text-muted-foreground">

              Profit modeling needs verified supplier costs. Open a product&apos;s Suppliers tab to

              find offers, or enter costs manually if you already have a quote.

            </p>

          </div>

          <Button variant="outline" onClick={() => setManualEntry(true)}>

            Enter costs manually

          </Button>

        </div>

      </div>

    );

  }



  return (

    <div className="space-y-8">

      <PageHeader

        title="Profit Calculator"

        description="Model landed cost, fees, and margin before you commit — same logic used in product detail panels."

      />



      {supplierMatchState === "similar" ? (

        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">

          Approximate supplier match — verify SKU and landed cost before ordering inventory.

        </div>

      ) : manualEntry && supplierMatchState === "none" ? (

        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">

          Manual cost entry — supplier match was unavailable. Double-check landed cost before

          scaling.

        </div>

      ) : null}



      <div className="grid lg:grid-cols-5 gap-6">

        <div className="lg:col-span-3 space-y-6">

          <FormSection

            title="Cost inputs"

            description="All amounts in USD. Pre-filled when opened from a product offer."

            icon={DollarSign}

          >

            <FieldLabel htmlFor="profit-title">Product name</FieldLabel>

            <Input

              id="profit-title"

              value={productTitle}

              onChange={(e) => setProductTitle(e.target.value)}

              className="input-elegant"

            />

            <div className="space-y-2">

              <FieldLabel>Selling platform</FieldLabel>

              <Select

                value={sellingPlatform}

                onValueChange={(v) => {

                  setSellingPlatform(v as SellingPlatform);

                  setPlatformFeeManual(false);

                }}

              >

                <SelectTrigger className="input-elegant">

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

              {PLATFORM_FEE_TABLE[sellingPlatform].notes ? (

                <p className="text-xs text-muted-foreground">

                  {PLATFORM_FEE_TABLE[sellingPlatform].notes}

                </p>

              ) : null}

              {sellingPrice > 0 && feeBreakdown.total > 0 ? (

                <ul className="text-xs text-muted-foreground space-y-0.5 rounded-lg border border-border bg-muted/20 px-3 py-2">

                  <li className="flex justify-between gap-2">

                    <span>

                      Referral ({Math.round(feeBreakdown.referralRate * 100)}%)

                    </span>

                    <span className="tabular-nums">${feeBreakdown.referralFee.toFixed(2)}</span>

                  </li>

                  {feeBreakdown.flatFee > 0 ? (

                    <li className="flex justify-between gap-2">

                      <span>Per-order fee</span>

                      <span className="tabular-nums">${feeBreakdown.flatFee.toFixed(2)}</span>

                    </li>

                  ) : null}

                  <li className="flex justify-between gap-2 font-medium text-foreground pt-1 border-t border-border/60">

                    <span>Platform fees total</span>

                    <span className="tabular-nums">${feeBreakdown.total.toFixed(2)}</span>

                  </li>

                </ul>

              ) : null}

            </div>

            <div className="grid sm:grid-cols-2 gap-4">

              {[

                { id: "productCost", label: "Product cost", value: productCost, set: setProductCost },

                { id: "shippingCost", label: "Shipping", value: shippingCost, set: setShippingCost },

                {

                  id: "platformFee",

                  label: "Platform fees",

                  value: platformFee,

                  set: (v: number) => {

                    setPlatformFee(v);

                    setPlatformFeeManual(true);

                  },

                },

                { id: "adSpend", label: "Ad spend (per unit)", value: adSpend, set: setAdSpend },

                { id: "vatDuties", label: "VAT / duties", value: vatDuties, set: setVatDuties },

                { id: "sellingPrice", label: "Selling price", value: sellingPrice, set: setSellingPrice },

              ].map((field) => (

                <div key={field.id} className="space-y-2">

                  <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>

                  <Input

                    id={field.id}

                    type="number"

                    min={0}

                    step="0.01"

                    value={field.value}

                    onChange={(e) => field.set(Number(e.target.value))}

                    className="input-elegant"

                  />

                </div>

              ))}

            </div>

          </FormSection>



          {historyQuery.data && historyQuery.data.length > 0 ? (

            <FormSection title="Saved scenarios" description={`${historyQuery.data.length} calculations`}>

              <div className="space-y-2">

                {historyQuery.data.map((calc) => (

                  <div

                    key={calc.id}

                    className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 hover:bg-muted/20 transition-colors"

                  >

                    <div className="min-w-0">

                      <p className="font-medium truncate text-sm">{calc.productTitle}</p>

                      <p className="text-xs text-muted-foreground mt-0.5">

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

            </FormSection>

          ) : null}

        </div>



        <div className="lg:col-span-2 space-y-4">

          <div className="grid gap-3">

            <StatCard

              label="Net profit"

              value={`$${netProfit.toFixed(2)}`}

              icon={PiggyBank}

              valueClassName={netProfit >= 0 ? "profit-result-positive" : "profit-result-negative"}

            />

            <StatCard

              label="ROI"

              value={`${roi.toFixed(1)}%`}

              icon={TrendingUp}

              valueClassName={roi >= 100 ? "profit-result-positive" : roi >= 0 ? "text-warning" : "profit-result-negative"}

            />

            <StatCard label="Margin" value={`${margin.toFixed(1)}%`} icon={Percent} />

          </div>



          <div className="card-elevated p-5 space-y-4">

            <div>

              <p className="metric-label mb-2">Cost breakdown</p>

              {totalCosts > 0 ? (

                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted gap-0.5">

                  {costBreakdown.map((seg) => (

                    <div

                      key={seg.label}

                      className={cn("cost-bar-segment", seg.color)}

                      style={{ width: `${(seg.value / totalCosts) * 100}%` }}

                      title={`${seg.label}: $${seg.value.toFixed(2)}`}

                    />

                  ))}

                </div>

              ) : (

                <div className="h-2 rounded-full bg-muted" />

              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">

                {costBreakdown.map((seg) => (

                  <span key={seg.label}>

                    {seg.label}: ${seg.value.toFixed(2)}

                  </span>

                ))}

              </div>

            </div>

            <div className="product-profit-summary">

              <span className="text-sm text-muted-foreground">Total costs</span>

              <span className="font-semibold tabular-nums">${totalCosts.toFixed(2)}</span>

            </div>

            <div className="product-profit-summary">

              <span className="text-sm text-muted-foreground">Revenue</span>

              <span className="font-semibold tabular-nums">${sellingPrice.toFixed(2)}</span>

            </div>

          </div>



          <Button className="w-full" size="lg" onClick={handleSave} disabled={saveMutation.isPending}>

            {saveMutation.isPending ? <Spinner className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}

            Save calculation

          </Button>

        </div>

      </div>

    </div>

  );

}

