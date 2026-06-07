import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookmarkIcon } from "lucide-react";

export default function Watchlist() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Watchlist</h1>
        <p className="text-muted-foreground">Your saved products and searches</p>
      </div>
      <Card className="card-elevated p-12 text-center">
        <BookmarkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Watchlist coming soon</p>
      </Card>
    </div>
  );
}
