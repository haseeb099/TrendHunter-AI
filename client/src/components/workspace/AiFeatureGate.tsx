import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";

type AiFeatureGateProps = {
  disabled: boolean;
  feature?: string;
};

export function AiFeatureGate({ disabled, feature = "AI features" }: AiFeatureGateProps) {
  if (!disabled) return null;

  return (
    <Alert className="border-border bg-muted/30">
      <Sparkles className="h-4 w-4 text-muted-foreground" />
      <AlertDescription className="text-muted-foreground">
        {feature} require <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">OPENAI_API_KEY</code> in
        your server <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">.env</code> — see{" "}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">docs/API-ENV-SETUP.md</code>.
      </AlertDescription>
    </Alert>
  );
}
