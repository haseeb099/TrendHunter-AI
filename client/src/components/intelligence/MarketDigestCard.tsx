import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MarketDigestItem } from "@shared/intelligenceTypes";
import { TrendingDown, TrendingUp, Minus, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

type MarketDigestCardProps = {
  item: MarketDigestItem;
  onSelect?: (keyword: string) => void;
  selected?: boolean;
  showAds?: boolean;
};

function MomentumIcon({ label }: { label?: string | null }) {
  if (label === "rising") return <TrendingUp className="w-3.5 h-3.5 text-success" />;
  if (label === "declining") return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

export function MarketDigestCard({
  item,
  onSelect,
  selected,
  showAds = true,
}: MarketDigestCardProps) {
  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/30",
        selected && "border-primary bg-primary/5"
      )}
      onClick={() => onSelect?.(item.keyword)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(item.keyword);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm capitalize line-clamp-2">{item.keyword}</p>
        {item.momentumLabel ? <MomentumIcon label={item.momentumLabel} /> : null}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {item.momentumScore != null ? (
          <Badge variant="secondary" className="text-[10px]">
            Score {Math.round(item.momentumScore)}
          </Badge>
        ) : null}
        {item.changePercent90d != null ? (
          <Badge variant="outline" className="text-[10px]">
            {item.changePercent90d > 0 ? "+" : ""}
            {item.changePercent90d}% 90d
          </Badge>
        ) : null}
        {showAds && item.activeAdCount != null ? (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <Megaphone className="w-3 h-3" />
            {item.activeAdCount} ads
          </Badge>
        ) : null}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        {item.region} · {new Date(item.fetchedAt).toLocaleDateString()}
      </p>
    </Card>
  );
}
