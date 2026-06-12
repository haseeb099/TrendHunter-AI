import { useMemo, useState } from "react";
import type { CategoryTreeNode } from "@shared/searchTypes";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronRight, Layers, Search } from "lucide-react";

type CategorySelection = {
  category?: string;
  subcategory?: string;
  productType?: string;
};

type CategoryTreePickerProps = {
  tree: CategoryTreeNode[];
  loading?: boolean;
  selectedCategory?: string;
  selectedSubcategory?: string;
  selectedProductType?: string;
  onSelect: (selection: CategorySelection) => void;
};

function filterTree(tree: CategoryTreeNode[], query: string): CategoryTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return tree;
  return tree
    .map((root) => {
      const rootMatch = root.label.toLowerCase().includes(q) || root.value.includes(q);
      const children = (root.children ?? [])
        .map((sub) => {
          const subMatch = sub.label.toLowerCase().includes(q) || sub.value.toLowerCase().includes(q);
          const types = (sub.children ?? []).filter(
            (t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
          );
          if (subMatch || types.length > 0) {
            return { ...sub, children: subMatch ? sub.children : types };
          }
          return null;
        })
        .filter(Boolean) as CategoryTreeNode[];
      if (rootMatch || children.length > 0) {
        return { ...root, children: rootMatch ? root.children : children };
      }
      return null;
    })
    .filter(Boolean) as CategoryTreeNode[];
}

export function resolveCategoryPath(
  tree: CategoryTreeNode[],
  selection: CategorySelection
): string {
  if (!selection.category) return "All categories";
  const root = tree.find((r) => r.value === selection.category);
  if (!root) return selection.category;
  if (!selection.subcategory) return root.label;
  const sub = root.children?.find((s) => s.value === selection.subcategory);
  if (!sub) return root.label;
  if (!selection.productType) return `${root.label} › ${sub.label}`;
  const type = sub.children?.find((t) => t.value === selection.productType);
  return type ? `${root.label} › ${sub.label} › ${type.label}` : `${root.label} › ${sub.label}`;
}

export function CategoryTreePicker({
  tree,
  loading = false,
  selectedCategory,
  selectedSubcategory,
  selectedProductType,
  onSelect,
}: CategoryTreePickerProps) {
  const [expandedRoot, setExpandedRoot] = useState<string | null>(selectedCategory ?? null);
  const [expandedSub, setExpandedSub] = useState<string | null>(selectedSubcategory ?? null);
  const [categorySearch, setCategorySearch] = useState("");
  const filteredTree = useMemo(
    () => filterTree(tree, categorySearch),
    [tree, categorySearch]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 px-1 pb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          placeholder="Search categories…"
          className="h-9 bg-background/80 pl-9 text-xs"
          disabled={loading}
        />
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <div className="space-y-0.5 pb-2">
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 animate-pulse rounded-md bg-muted/60"
                  style={{ width: `${70 + (i % 3) * 10}%` }}
                />
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelect({})}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                  !selectedCategory
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
                All categories
              </button>
              {filteredTree.map((root) => {
                const rootOpen = expandedRoot === root.value || categorySearch.length > 0;
                const rootActive = selectedCategory === root.value && !selectedSubcategory;
                return (
                  <div key={root.value}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedRoot(rootOpen && !categorySearch ? null : root.value);
                        onSelect({ category: root.value });
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-1 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                        rootActive
                          ? "bg-secondary font-medium text-foreground"
                          : "text-foreground/90 hover:bg-muted/50"
                      )}
                    >
                      <span className="truncate">{root.label}</span>
                      {root.children?.length ? (
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                            rootOpen && "rotate-90"
                          )}
                        />
                      ) : null}
                    </button>
                    {rootOpen && root.children?.length ? (
                      <div className="ml-2.5 border-l border-border/70 pl-2">
                        {root.children.map((sub) => {
                          const subOpen = expandedSub === sub.value || categorySearch.length > 0;
                          const subActive =
                            selectedSubcategory === sub.value && !selectedProductType;
                          return (
                            <div key={`${root.value}-${sub.value}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedSub(subOpen && !categorySearch ? null : sub.value);
                                  onSelect({
                                    category: root.value,
                                    subcategory: sub.value,
                                  });
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors",
                                  subActive
                                    ? "bg-secondary/80 font-medium text-foreground"
                                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                )}
                              >
                                <span className="truncate">{sub.label}</span>
                                {sub.children?.length ? (
                                  <ChevronRight
                                    className={cn(
                                      "h-3 w-3 shrink-0 transition-transform",
                                      subOpen && "rotate-90"
                                    )}
                                  />
                                ) : null}
                              </button>
                              {subOpen && sub.children?.length ? (
                                <div className="ml-2 space-y-0.5 border-l border-border/50 pl-2 pb-0.5">
                                  {sub.children.map((type) => (
                                    <button
                                      key={`${sub.value}-${type.value}`}
                                      type="button"
                                      onClick={() =>
                                        onSelect({
                                          category: root.value,
                                          subcategory: sub.value,
                                          productType: type.value,
                                        })
                                      }
                                      className={cn(
                                        "block w-full truncate rounded px-2 py-1 text-left text-[10px] transition-colors",
                                        selectedProductType === type.value
                                          ? "bg-primary/15 font-medium text-primary"
                                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                      )}
                                      title={type.label}
                                    >
                                      {type.label}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
