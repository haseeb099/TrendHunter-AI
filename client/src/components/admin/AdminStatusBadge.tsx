import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@shared/adminTypes";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<AccountStatus, string> = {
  active: "bg-success/10 text-success border-success/25",
  deactivated: "bg-destructive/10 text-destructive border-destructive/25",
  flagged: "bg-warning/10 text-warning border-warning/25",
  paused: "bg-muted text-muted-foreground border-border",
};

export function AdminStatusBadge({
  status,
  className,
}: {
  status: AccountStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", STATUS_STYLES[status], className)}>
      {status}
    </Badge>
  );
}

export const ACCOUNT_STATUS_STYLES = STATUS_STYLES;
