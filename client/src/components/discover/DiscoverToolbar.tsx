import { useMemo } from "react";
import type { CategoryTreeNode, RegionCode } from "@shared/searchTypes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TrendWindowSelector } from "@/components/intelligence/TrendWindowSelector";
import { CategoryTreePicker, resolveCategoryPath } from "./CategoryTreePicker";
import { Filter, FolderTree, Search, X } from "lucide-react";
import type { TrendWindow } from "@shared/intelligenceTypes";

type RegionOption = { code: RegionCode; label: string };

type DiscoverToolbarProps = {
  tree: CategoryTreeNode[];
  loading?: boolean;
  regions: RegionOption[];
  region: RegionCode;
  onRegionChange: (region: RegionCode) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
  selectedProductType?: string;
  onCategorySelect: (selection: {
    category?: string;
    subcategory?: string;
    productType?: string;
  }) => void;
  trendWindow: TrendWindow;
  onTrendWindowChange: (window: TrendWindow) => void;
  onOpenFilters: () => void;
  categorySheetOpen: boolean;
  onCategorySheetOpenChange: (open: boolean) => void;
};

function countTreeNodes(tree: CategoryTreeNode[]) {
  let subs = 0;
  let types = 0;
  for (const root of tree) {
    for (const sub of root.children ?? []) {
      subs += 1;
      types += sub.children?.length ?? 0;
    }
  }
  return { roots: tree.length, subs, types };
}

export function DiscoverToolbar({
  tree,
  loading = false,
  regions,
  region,
  onRegionChange,
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  selectedSubcategory,
  selectedProductType,
  onCategorySelect,
  trendWindow,
  onTrendWindowChange,
  onOpenFilters,
  categorySheetOpen,
  onCategorySheetOpenChange,
}: DiscoverToolbarProps) {
  const counts = useMemo(() => countTreeNodes(tree), [tree]);
  const selectionPath = resolveCategoryPath(tree, {
    category: selectedCategory,
    subcategory: selectedSubcategory,
    productType: selectedProductType,
  });
  const hasSelection = Boolean(selectedCategory || selectedSubcategory || selectedProductType);
  const rootCategoryValue = selectedCategory ?? "all";

  const handleCategorySelect = (selection: {
    category?: string;
    subcategory?: string;
    productType?: string;
  }) => {
    onCategorySelect(selection);
    if (selection.productType || !selection.category) {
      onCategorySheetOpenChange(false);
    }
  };

  const handleRootCategoryChange = (value: string) => {
    if (value === "all") {
      onCategorySelect({});
      return;
    }
    onCategorySelect({ category: value });
  };

  return (
    <>
      <div className="shrink-0 space-y-3 border-b border-border bg-muted/15 px-3 py-3 sm:px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search trending products (e.g. wireless earbuds, pet feeder)…"
            className="h-10 bg-background/80 pl-9 pr-9 text-sm"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={rootCategoryValue} onValueChange={handleRootCategoryChange}>
            <SelectTrigger className="h-9 w-full min-w-[10rem] flex-1 text-xs sm:max-w-[13rem]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All categories
              </SelectItem>
              {tree.map((root) => (
                <SelectItem key={root.value} value={root.value} className="text-xs">
                  {root.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs"
            onClick={() => onCategorySheetOpenChange(true)}
            title="Browse subcategories and product types"
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Subcategories</span>
          </Button>

          <Select value={region} onValueChange={(v) => onRegionChange(v as RegionCode)}>
            <SelectTrigger className="h-9 w-[9.5rem] text-xs">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.code} value={r.code} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TrendWindowSelector
            value={trendWindow}
            onChange={onTrendWindowChange}
            className="min-w-[10.5rem]"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={onOpenFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">More</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {loading
              ? "Loading taxonomy…"
              : `${counts.roots} categories · ${counts.subs} subs · ${counts.types} types`}
          </Badge>
          {hasSelection ? (
            <Badge variant="outline" className="max-w-full truncate text-[10px] font-normal">
              {selectionPath}
            </Badge>
          ) : null}
          {hasSelection ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
              onClick={() => onCategorySelect({})}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <Sheet open={categorySheetOpen} onOpenChange={onCategorySheetOpenChange}>
        <SheetContent side="left" className="flex w-[min(100vw-2rem,22rem)] flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle className="text-sm">Subcategories & types</SheetTitle>
            <SheetDescription className="text-xs">
              Drill into {counts.subs} subcategories and {counts.types} product types
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-3 pt-3">
            <CategoryTreePicker
              tree={tree}
              loading={loading}
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              selectedProductType={selectedProductType}
              onSelect={handleCategorySelect}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
