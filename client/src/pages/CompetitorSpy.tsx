import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, TrendingDown } from "lucide-react";

export default function CompetitorSpy() {
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Competitor Spy</h1>
        <p className="text-muted-foreground">Analyze competitor listings and strategies</p>
      </div>

      <Card className="card-elevated p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Competitor URL or Keyword</label>
            <Input
              placeholder="Enter competitor store URL or product keyword..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-elegant"
            />
          </div>
          <Button className="btn-primary">
            <Users className="w-4 h-4 mr-2" />
            Analyze Competitor
          </Button>
        </div>
      </Card>

      <Card className="card-elevated p-12 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Enter a competitor URL to begin analysis</p>
      </Card>
    </div>
  );
}
