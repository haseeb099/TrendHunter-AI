import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookmarkIcon, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Watchlist() {
  const watchlistQuery = trpc.watchlist.getWatchlist.useQuery();
  const removeMutation = trpc.watchlist.removeFromWatchlist.useMutation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Watchlist</h1>
        <p className="text-muted-foreground">Your saved products and searches ({watchlistQuery.data?.length || 0})</p>
      </div>

      {watchlistQuery.data && watchlistQuery.data.length > 0 ? (
        <div className="grid gap-4">
          {watchlistQuery.data.map((item) => (
            <Card key={item.id} className="card-elevated p-6 flex gap-4 items-start">
              {item.productImage && (
                <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                  <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{item.productTitle}</h3>
                <div className="flex gap-2 mb-3">
                  <Badge variant="outline">{item.platform}</Badge>
                  {item.price && <Badge variant="outline">${item.price}</Badge>}
                </div>
                {item.notes && <p className="text-sm text-muted-foreground mb-3">{item.notes}</p>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMutation.mutate({ id: item.id })}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-elevated p-12 text-center">
          <BookmarkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Your watchlist is empty</p>
        </Card>
      )}
    </div>
  );
}
