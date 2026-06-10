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
import { Search } from "lucide-react";
import type { RegionCode } from "@shared/searchTypes";

const SUGGESTED = [
  "wireless earbuds",
  "portable blender",
  "pet grooming kit",
  "led desk lamp",
  "skincare serum",
];

type KeywordExplorerProps = {
  keyword: string;
  region: RegionCode;
  onKeywordChange: (kw: string) => void;
  onRegionChange: (region: RegionCode) => void;
  onSearch?: () => void;
  suggestions?: string[];
  placeholder?: string;
};

export function KeywordExplorer({
  keyword,
  region,
  onKeywordChange,
  onRegionChange,
  onSearch,
  suggestions = SUGGESTED,
  placeholder = "e.g. wireless earbuds",
}: KeywordExplorerProps) {
  const [draft, setDraft] = useState(keyword);

  useEffect(() => {
    setDraft(keyword);
  }, [keyword]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onKeywordChange(trimmed);
    onSearch?.();
  };

  return (
    <div className="card-elevated p-4 sm:p-5 space-y-4">
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="pl-9 input-elegant h-11"
          />
        </div>
        <div className="space-y-1.5 sm:w-36">
          <Label className="sr-only">Region</Label>
          <Select value={region} onValueChange={(v) => onRegionChange(v as RegionCode)}>
            <SelectTrigger className="h-11 input-elegant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="UK">UK</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
              <SelectItem value="GLOBAL">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="h-11 sm:px-8">
          Analyze
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground self-center mr-1">Try:</span>
        {suggestions.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant="secondary"
            className="text-xs h-7 capitalize"
            onClick={() => {
              setDraft(s);
              onKeywordChange(s);
              onSearch?.();
            }}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
