import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Star, Truck, Heart, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

export default function ProductSearch() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);

  const searchQuery = trpc.search.searchProducts.useQuery(
    { query, platform, filters: { priceRange: { min: priceMin, max: priceMax } } },
    { enabled: query.length > 0 }
  );

  const addToWatchlist = trpc.watchlist.addToWatchlist.useMutation();
  const addToPipeline = trpc.pipeline.createPipelineItem.useMutation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchQuery.refetch();
    }
  };

  const handleAddToWatchlist = (product: any) => {
    addToWatchlist.mutate({
      productId: product.id,
      productTitle: product.title,
      productImage: product.image,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl,
    });
  };

  const handleAddToPipeline = (product: any) => {
    addToPipeline.mutate({
      productTitle: product.title,
      productImage: product.image,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl,
      stage: "testing",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Product Search</h1>
        <p className="text-muted-foreground">Search across eBay, Amazon, Shopify & TikTok Shop simultaneously</p>
      </div>

      {/* Search Form */}
      <Card className="card-elevated p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search products (e.g., wireless headphones, phone charger)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-elegant flex-1"
            />
            <Button type="submit" disabled={searchQuery.isPending} className="btn-primary">
              {searchQuery.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="input-elegant w-full"
              >
                <option value="all">All Platforms</option>
                <option value="ebay">eBay</option>
                <option value="amazon">Amazon</option>
                <option value="shopify">Shopify</option>
                <option value="tiktok">TikTok Shop</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Min Price ($)</label>
              <Input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(Number(e.target.value))}
                className="input-elegant"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Max Price ($)</label>
              <Input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="input-elegant"
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Results */}
      {searchQuery.isLoading && (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Spinner className="w-8 h-8 mx-auto mb-3" />
            <p className="text-muted-foreground">Searching across all platforms...</p>
          </div>
        </div>
      )}

      {searchQuery.data?.results && searchQuery.data.results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Results ({searchQuery.data.results.length})</h2>
            <p className="text-sm text-muted-foreground">Showing top matches</p>
          </div>
          <div className="grid gap-4">
            {searchQuery.data.results.map((product: any) => (
              <Card key={product.id} className="card-elevated p-6 hover:shadow-xl transition-all">
                <div className="flex gap-6">
                  <div className="w-40 h-40 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{product.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            {product.platform}
                          </Badge>
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                            {product.supplier}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 py-3 border-y border-border">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Price</p>
                        <p className="text-lg font-bold gradient-text">${product.price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Shipping</p>
                        <p className="flex items-center gap-1 font-semibold">
                          <Truck className="w-4 h-4" />
                          {product.shippingDays}d
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Rating</p>
                        <p className="flex items-center gap-1 font-semibold">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {product.rating}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Potential</p>
                        <p className="text-lg font-bold text-green-400">Good</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Margin</p>
                        <p className="text-lg font-bold text-blue-400">~45%</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => handleAddToWatchlist(product)}
                        disabled={addToWatchlist.isPending}
                        className="btn-primary"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Add to Watchlist
                      </Button>
                      <Button
                        onClick={() => handleAddToPipeline(product)}
                        disabled={addToPipeline.isPending}
                        className="btn-secondary"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Pipeline
                      </Button>
                      <Button variant="outline">View Details</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!searchQuery.isLoading && query && searchQuery.data?.results?.length === 0 && (
        <Card className="card-elevated p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No products found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </Card>
      )}

      {!query && (
        <Card className="card-elevated p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Start Your Product Search</p>
          <p className="text-muted-foreground">Enter a product name or keyword to search across all platforms</p>
        </Card>
      )}
    </div>
  );
}
