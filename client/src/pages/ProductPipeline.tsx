import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ProductPipeline() {
  const pipelineQuery = trpc.pipeline.getPipelineItems.useQuery();
  const deleteMutation = trpc.pipeline.deletePipelineItem.useMutation();

  const stages = ["testing", "scaling", "paused", "dropped"] as const;
  const stageColors = {
    testing: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    scaling: "bg-green-500/10 text-green-400 border-green-500/30",
    paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    dropped: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Product Pipeline</h1>
          <p className="text-muted-foreground">Track products through testing, scaling, and beyond</p>
        </div>
        <Button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <div key={stage} className="space-y-3">
            <h3 className="font-semibold capitalize text-sm uppercase tracking-wide text-muted-foreground">
              {stage} ({pipelineQuery.data?.filter((p) => p.stage === stage).length || 0})
            </h3>
            <div className="space-y-3 min-h-96">
              {pipelineQuery.data
                ?.filter((p) => p.stage === stage)
                .map((product) => (
                  <Card key={product.id} className={`card-elevated p-4 cursor-move hover:shadow-lg transition ${stageColors[stage]}`}>
                    <div className="space-y-2">
                      <p className="font-semibold text-sm line-clamp-2">{product.productTitle}</p>
                      {product.price && <p className="text-xs text-muted-foreground">${product.price}</p>}
                      {product.validationScore && (
                        <div className="flex items-center justify-between text-xs">
                          <span>Score</span>
                          <span className="font-bold">{product.validationScore}/100</span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ id: product.id })}
                        className="w-full mt-2 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
