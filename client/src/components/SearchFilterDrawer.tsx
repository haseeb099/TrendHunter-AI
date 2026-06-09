import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import type { ProductHuntFilters, RegionCode, ShipFromCode, SortOption } from "@shared/searchTypes";
import { toast } from "sonner";

type SearchFilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProductHuntFilters;
  onApply: (filters: ProductHuntFilters) => void;
  onPriceRangeChange?: (min: number, max: number) => void;
  priceMin?: number;
  priceMax?: number;
};

export function SearchFilterDrawer({
  open,
  onOpenChange,
  filters,
  onApply,
  onPriceRangeChange,
  priceMin = 0,
  priceMax = 1000,
}: SearchFilterDrawerProps) {
  const [local, setLocal] = useState<ProductHuntFilters>(filters);
  const [localPriceMin, setLocalPriceMin] = useState(priceMin);
  const [localPriceMax, setLocalPriceMax] = useState(priceMax);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    if (open) {
      setLocal(filters);
      setLocalPriceMin(priceMin);
      setLocalPriceMax(priceMax);
    }
  }, [open, filters, priceMin, priceMax]);

  const filterOptions = trpc.search.getFilterOptions.useQuery();
  const presetsQuery = trpc.search.getFilterPresets.useQuery();
  const utils = trpc.useUtils();

  const savePreset = trpc.search.saveFilterPreset.useMutation({
    onSuccess: async () => {
      await utils.search.getFilterPresets.invalidate();
      toast.success("Filter preset saved");
      setPresetName("");
    },
  });

  const deletePreset = trpc.search.deleteFilterPreset.useMutation({
    onSuccess: async () => {
      await utils.search.getFilterPresets.invalidate();
      toast.success("Preset deleted");
    },
  });

  const update = (patch: Partial<ProductHuntFilters>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
  };

  const handleApply = () => {
    onApply({
      ...local,
      priceRange: { min: localPriceMin, max: localPriceMax },
    });
    onPriceRangeChange?.(localPriceMin, localPriceMax);
    onOpenChange(false);
  };

  const toggleShipFrom = (code: ShipFromCode) => {
    const current = local.shipFrom ?? [];
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    update({ shipFrom: next.length > 0 ? next : undefined });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Search filters</SheetTitle>
          <SheetDescription>Refine by region, category, price, shipping, and more.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="space-y-2">
            <Label>Region</Label>
            <Select
              value={local.region ?? filterOptions.data?.defaultRegion ?? "US"}
              onValueChange={(v) => update({ region: v as RegionCode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.data?.regions.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.label} ({r.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={local.category ?? "all"}
              onValueChange={(v) => update({ category: v === "all" ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {filterOptions.data?.categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min price</Label>
              <Input
                type="number"
                min={0}
                value={localPriceMin}
                onChange={(e) => setLocalPriceMin(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max price</Label>
              <Input
                type="number"
                min={0}
                value={localPriceMax}
                onChange={(e) => setLocalPriceMax(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ship from</Label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.data?.shipFromOptions.map((opt) => {
                const active = local.shipFrom?.includes(opt.code);
                return (
                  <Button
                    key={opt.code}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleShipFrom(opt.code)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sort by</Label>
            <Select
              value={local.sort ?? "trend_score"}
              onValueChange={(v) => update({ sort: v as SortOption })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.data?.sortOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min rating</Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={local.minRating ?? ""}
                onChange={(e) =>
                  update({ minRating: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max ship days</Label>
              <Input
                type="number"
                min={1}
                value={local.maxShippingDays ?? ""}
                onChange={(e) =>
                  update({
                    maxShippingDays: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          {presetsQuery.data && presetsQuery.data.length > 0 ? (
            <div className="space-y-2">
              <Label>Saved presets</Label>
              <div className="space-y-2">
                {presetsQuery.data.map((preset) => (
                  <div key={preset.id} className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-start"
                      onClick={() => {
                        const loaded = (preset.filters as ProductHuntFilters) ?? {};
                        setLocal(loaded);
                        if (loaded.priceRange) {
                          setLocalPriceMin(loaded.priceRange.min);
                          setLocalPriceMax(loaded.priceRange.max);
                        }
                        toast.info(`Loaded "${preset.name}"`);
                      }}
                    >
                      {preset.name}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePreset.mutate({ id: preset.id })}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Save current as preset</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                disabled={!presetName.trim() || savePreset.isPending}
                onClick={() =>
                  savePreset.mutate({
                    name: presetName.trim(),
                    filters: { ...local, priceRange: { min: localPriceMin, max: localPriceMax } },
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
