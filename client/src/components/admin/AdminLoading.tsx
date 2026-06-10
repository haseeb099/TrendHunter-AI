import { Spinner } from "@/components/ui/spinner";

export function AdminLoading({ label = "Loading console…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <Spinner className="w-8 h-8 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
