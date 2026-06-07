import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Star, Truck, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

export default function ProductSearch() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });

  const searchQuery = trpc.search.searchProducts.useQuery(
    { query, platform, filters: { priceRange } },
    { enabled: query.length > 0 }
  );

  const addToWatchlist = trpc.watchlist.addToWatchlist.useMutation();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Product Search</h1>
        <p className="text-muted-foreground">Search across all platforms simultaneously</p>
      </div>

      {/* Search Form */}
      <Card className="card-elevated p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-elegant flex-1"
            />
            <Button type="submit" className="btn-primary">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="text-sm font-semibold mb-2 block">Min Price</label>
              <Input
                type="number"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                className="input-elegant"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Max Price</label>
              <Input
                type="number"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                className="input-elegant"
              />
            </div>
          </div>
        </form>
      </Card>

      {/* Results */}
      {searchQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {searchQuery.data?.results && searchQuery.data.results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Results ({searchQuery.data.results.length})</h2>
          <div className="grid gap-4">
            {searchQuery.data.results.map((product: any) => (
              <Card key={product.id} className="card-elevated p-6 flex gap-6">
                <div className="w-32 h-32 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                  <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold">{product.title}</h3>
                    <Badge variant="outline">{product.platform}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="text-lg font-bold gradient-text">${product.price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping</p>
                      <p className="flex items-center gap-1">
                        <Truck className="w-4 h-4" />
                        {product.shippingDays} days
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-semibold">{product.supplier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {product.rating}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="btn-primary" onClick={() => handleAddToWatchlist(product)}>
                      Add to Watchlist
                    </Button>
                    <Button className="btn-secondary">View Details</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!searchQuery.isLoading && query && searchQuery.data?.results?.length === 0 && (
        <Card className="card-elevated p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No products found. Try a different search.</p>
        </Card>
      )}

      {!query && (
        <Card className="card-elevated p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Enter a search term to get started</p>
        </Card>
      )}
    </div>
  );
}
