import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function SocialMediaKit() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Social Media Kit</h1>
        <p className="text-muted-foreground">Generate AI-powered marketing content</p>
      </div>
      <Card className="card-elevated p-12 text-center">
        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Social media kit coming soon</p>
      </Card>
    </div>
  );
}
