import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function ProductPipeline() {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [platform, setPlatform] = useState("manual");
  const [imageUrl, setImageUrl] = useState<string | undefined>();

  const pipelineQuery = trpc.pipeline.getPipelineItems.useQuery();
  const createMutation = trpc.pipeline.createPipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Product added to pipeline");
      setAddOpen(false);
      setTitle("");
      setPrice("");
      setPlatform("manual");
      setImageUrl(undefined);
    },
    onError: (error) => toast.error(error.message || "Failed to add product"),
  });
  const updateMutation = trpc.pipeline.updatePipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Stage updated");
    },
    onError: (error) => toast.error(error.message || "Failed to update stage"),
  });
  const deleteMutation = trpc.pipeline.deletePipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      await utils.analytics.getDashboardMetrics.invalidate();
      toast.success("Removed from pipeline");
    },
    onError: (error) => toast.error(error.message || "Failed to remove product"),
  });

  const stages = ["testing", "scaling", "paused", "dropped"] as const;
  const stageColors = {
    testing: "border-blue-500/30 bg-blue-500/5",
    scaling: "border-emerald-500/30 bg-emerald-500/5",
    paused: "border-amber-500/30 bg-amber-500/5",
    dropped: "border-red-500/30 bg-red-500/5",
  };
  const stageLabels = {
    testing: "Testing",
    scaling: "Scaling",
    paused: "Paused",
    dropped: "Dropped",
  };

  if (pipelineQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const handleAddProduct = () => {
    if (!title.trim()) {
      toast.error("Product title is required");
      return;
    }
    createMutation.mutate({
      productTitle: title.trim(),
      productImage: imageUrl,
      platform,
      price: price ? Number.parseFloat(price) : undefined,
      stage: "testing",
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Product Pipeline"
        description="Track products from testing through scaling"
        actions={
          <Button className="h-10" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add product
          </Button>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="surface border-border">
          <DialogHeader>
            <DialogTitle>Add product to pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pipeline-title">Product title</Label>
              <Input
                id="pipeline-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product name"
                className="input-elegant"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pipeline-price">Price ($)</Label>
                <Input
                  id="pipeline-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="input-elegant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pipeline-platform">Platform</Label>
                <Input
                  id="pipeline-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="ebay, amazon..."
                  className="input-elegant"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product image</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} folder="pipeline" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} disabled={createMutation.isPending}>
              Add to testing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <div key={stage} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stageLabels[stage]}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {pipelineQuery.data?.filter((p) => p.stage === stage).length || 0}
              </span>
            </div>
            <div className="space-y-3 min-h-80 rounded-xl border border-dashed border-border/60 p-2 bg-muted/10">
              {pipelineQuery.data
                ?.filter((p) => p.stage === stage)
                .map((product) => (
                  <Card
                    key={product.id}
                    className={`surface p-3 border ${stageColors[stage]} hover:shadow-md transition-shadow`}
                  >
                    <div className="space-y-2">
                      {product.productImage && (
                        <div className="w-full h-20 rounded-lg overflow-hidden ring-1 ring-border">
                          <img
                            src={product.productImage}
                            alt={product.productTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="font-medium text-sm line-clamp-2 leading-snug">{product.productTitle}</p>
                      {product.price != null && (
                        <p className="text-xs text-muted-foreground">${product.price}</p>
                      )}
                      {product.validationScore != null && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Score</span>
                          <span className="font-semibold text-foreground">{product.validationScore}/100</span>
                        </div>
                      )}
                      {product.region ? (
                        <p className="text-xs text-muted-foreground">Region: {product.region}</p>
                      ) : null}
                      {product.landedCost != null ? (
                        <p className="text-xs text-muted-foreground">Landed: ${product.landedCost}</p>
                      ) : null}
                      {product.supplierPlatform ? (
                        <p className="text-xs text-muted-foreground capitalize">
                          Supplier: {product.supplierPlatform}
                        </p>
                      ) : null}
                      {product.notes ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{product.notes}</p>
                      ) : null}
                      <Select
                        value={product.stage}
                        onValueChange={(v) =>
                          updateMutation.mutate({
                            id: product.id,
                            stage: v as (typeof stages)[number],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((s) => (
                            <SelectItem key={s} value={s}>
                              {stageLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ id: product.id })}
                        disabled={deleteMutation.isPending}
                        className="w-full h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              {!pipelineQuery.isFetching &&
                !pipelineQuery.data?.some((p) => p.stage === stage) && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Layers className="w-5 h-5 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No products</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
