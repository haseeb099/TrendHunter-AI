import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldLabelProps = {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
};

export function FieldLabel({ htmlFor, children, hint, className }: FieldLabelProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {children}
      </Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
