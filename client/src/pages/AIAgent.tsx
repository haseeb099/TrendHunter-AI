import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function AIAgent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">AI Agent Chat</h1>
        <p className="text-muted-foreground">Conversational product research advisor</p>
      </div>
      <Card className="card-elevated p-12 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">AI agent chat coming soon</p>
      </Card>
    </div>
  );
}
