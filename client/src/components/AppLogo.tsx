import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
};

const sizes = {
  sm: { box: "h-8 w-8", icon: "h-3.5 w-3.5", text: "text-sm" },
  md: { box: "h-9 w-9", icon: "h-4 w-4", text: "text-base" },
  lg: { box: "h-11 w-11", icon: "h-5 w-5", text: "text-lg" },
};

export function AppLogo({
  className,
  showText = true,
  size = "md",
  inverted = false,
}: AppLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[10px] shadow-xs",
          inverted ? "bg-white/12 text-white border border-white/10" : "bg-primary text-primary-foreground",
          s.box
        )}
      >
        <Crosshair className={s.icon} strokeWidth={2.25} />
      </div>
      {showText ? (
        <div className="min-w-0 leading-none">
          <span
            className={cn(
              "font-display font-semibold tracking-tight block",
              s.text,
              inverted && "text-white"
            )}
          >
            DropHunter
          </span>
          {size !== "sm" ? (
            <span
              className={cn(
                "text-[11px] mt-1 block truncate",
                inverted ? "text-white/45" : "text-muted-foreground"
              )}
            >
              Product intelligence
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
