import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Plus,
  FlaskConical,
  Rocket,
  PauseCircle,
  XCircle,
  GripVertical,
} from "lucide-react";
import type { PipelineItem } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STAGES = ["testing", "scaling", "paused", "dropped"] as const;
type Stage = (typeof STAGES)[number];

const stageConfig: Record<
  Stage,
  { label: string; columnClass: string; icon: typeof Layers }
> = {
  testing: { label: "Testing", columnClass: "pipeline-column-testing", icon: FlaskConical },
  scaling: { label: "Scaling", columnClass: "pipeline-column-scaling", icon: Rocket },
  paused: { label: "Paused", columnClass: "pipeline-column-paused", icon: PauseCircle },
  dropped: { label: "Dropped", columnClass: "pipeline-column-dropped", icon: XCircle },
};

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

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const stageCounts = useMemo(() => {
    const items = pipelineQuery.data ?? [];
    return {
      total: items.length,
      testing: items.filter((p) => p.stage === "testing").length,
      scaling: items.filter((p) => p.stage === "scaling").length,
      active: items.filter((p) => p.stage === "testing" || p.stage === "scaling").length,
    };
  }, [pipelineQuery.data]);

  if (pipelineQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (pipelineQuery.isError) {
    return (
      <div className="card-elevated max-w-md mx-auto p-8 text-center space-y-4">
        <p className="font-medium text-sm">Could not load pipeline</p>
        <p className="text-sm text-muted-foreground">{pipelineQuery.error.message}</p>
        <Button variant="outline" onClick={() => pipelineQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const product = active.data.current?.product as PipelineItem | undefined;
    const fromStage = active.data.current?.stage as Stage | undefined;
    const toStage = String(over.id) as Stage;

    if (!product || !fromStage || !STAGES.includes(toStage) || fromStage === toStage) return;
    updateMutation.mutate({ id: product.id, stage: toStage });
  };

  const activeProduct = useMemo(() => {
    if (!activeDragId || !pipelineQuery.data) return null;
    const id = Number(activeDragId.replace("pipeline-", ""));
    return pipelineQuery.data.find((p) => p.id === id) ?? null;
  }, [activeDragId, pipelineQuery.data]);

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
        description="Kanban from testing through scaling — add from Discover, validation, or manually."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add product
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total products" value={String(stageCounts.total)} icon={Layers} />
        <StatCard label="Testing" value={String(stageCounts.testing)} icon={FlaskConical} />
        <StatCard
          label="Scaling"
          value={String(stageCounts.scaling)}
          icon={Rocket}
          valueClassName="text-success"
        />
        <StatCard label="Active" value={String(stageCounts.active)} icon={Layers} />
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="surface border-border">
          <DialogHeader>
            <DialogTitle>Add product to pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="pipeline-title">Product title</FieldLabel>
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
                <FieldLabel htmlFor="pipeline-price">Price ($)</FieldLabel>
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
                <FieldLabel htmlFor="pipeline-platform">Platform</FieldLabel>
                <Input
                  id="pipeline-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="ebay, amazon…"
                  className="input-elegant"
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>Product image</FieldLabel>
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

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveDragId(String(e.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const config = stageConfig[stage];
            const StageIcon = config.icon;
            const items = pipelineQuery.data?.filter((p) => p.stage === stage) ?? [];

            return (
              <div key={stage} className="space-y-3 min-w-0">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <StageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {config.label}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </div>
                <PipelineColumn stage={stage} columnClass={config.columnClass}>
                  {items.map((product) => (
                    <DraggablePipelineCard key={product.id} product={product} stage={stage}>
                      <PipelineCardContent
                        product={product}
                        onDelete={() => deleteMutation.mutate({ id: product.id })}
                        onStageChange={(v) => updateMutation.mutate({ id: product.id, stage: v })}
                        deletePending={deleteMutation.isPending}
                      />
                    </DraggablePipelineCard>
                  ))}
                  {!pipelineQuery.isFetching && items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center pointer-events-none">
                      <Layers className="w-5 h-5 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Drop products here</p>
                    </div>
                  ) : null}
                </PipelineColumn>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeProduct ? (
            <Card className="surface p-3 border shadow-lg w-64 rotate-1 opacity-95">
              <p className="font-medium text-sm line-clamp-2">{activeProduct.productTitle}</p>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function PipelineColumn({
  stage,
  columnClass,
  children,
}: {
  stage: Stage;
  columnClass: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-3 min-h-72 rounded-xl border border-dashed p-2 transition-colors",
        columnClass,
        isOver && "ring-2 ring-primary/35 border-primary/40"
      )}
    >
      {children}
    </div>
  );
}

function DraggablePipelineCard({
  product,
  stage,
  children,
}: {
  product: PipelineItem;
  stage: Stage;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pipeline-${product.id}`,
    data: { product, stage },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "surface p-3 border hover:shadow-sm transition-shadow",
        stageConfig[stage].columnClass,
        isDragging && "opacity-40"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mb-2 -mt-1"
        aria-label={`Drag ${product.productTitle}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[10px] uppercase tracking-wider">Drag to move</span>
      </button>
      {children}
    </Card>
  );
}

function PipelineCardContent({
  product,
  onDelete,
  onStageChange,
  deletePending,
}: {
  product: PipelineItem;
  onDelete: () => void;
  onStageChange: (stage: Stage) => void;
  deletePending: boolean;
}) {
  return (
    <div className="space-y-2">
      {product.productImage ? (
        <div className="w-full h-20 rounded-lg overflow-hidden ring-1 ring-border">
          <img
            src={product.productImage}
            alt={product.productTitle}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <p className="font-medium text-sm line-clamp-2 leading-snug">{product.productTitle}</p>
      {product.price != null ? (
        <p className="text-xs text-muted-foreground tabular-nums">${product.price}</p>
      ) : null}
      {product.validationScore != null ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Validation</span>
          <span className="font-semibold text-foreground tabular-nums">
            {product.validationScore}/100
          </span>
        </div>
      ) : null}
      <Select value={product.stage} onValueChange={(v) => onStageChange(v as Stage)}>
        <SelectTrigger className="h-8 text-xs" aria-label="Change pipeline stage">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {stageConfig[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        disabled={deletePending}
        className="w-full h-8 text-xs text-destructive hover:bg-destructive/10"
      >
        Remove
      </Button>
    </div>
  );
}
