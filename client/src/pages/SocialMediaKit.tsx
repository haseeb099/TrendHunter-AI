import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

export default function SocialMediaKit() {
  const [productTitle, setProductTitle] = useState("");
  const [productBenefit, setProductBenefit] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const hashtagsMutation = trpc.social.generateHashtags.useMutation();
  const adCopyMutation = trpc.social.generateAdCopy.useMutation();
  const captionMutation = trpc.social.generateCaption.useMutation();

  const handleGenerateHashtags = async () => {
    if (!productTitle.trim()) return;
    await hashtagsMutation.mutateAsync({ productTitle });
  };

  const handleGenerateAdCopy = async () => {
    if (!productTitle.trim() || !productBenefit.trim()) return;
    await adCopyMutation.mutateAsync({ productTitle, productBenefit });
  };

  const handleGenerateCaption = async (platform: "tiktok" | "instagram") => {
    if (!productTitle.trim()) return;
    await captionMutation.mutateAsync({ productTitle, platform });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Social Media Kit</h1>
        <p className="text-muted-foreground">Generate AI-powered marketing content for your products</p>
      </div>

      <Card className="card-elevated p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Product Title</label>
            <Input
              placeholder="Enter product name..."
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              className="input-elegant"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Key Benefit</label>
            <Input
              placeholder="e.g., Wireless, Waterproof, Fast Charging..."
              value={productBenefit}
              onChange={(e) => setProductBenefit(e.target.value)}
              className="input-elegant"
            />
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            <Button onClick={handleGenerateHashtags} disabled={hashtagsMutation.isPending} className="btn-primary">
              {hashtagsMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Hashtags
            </Button>
            <Button onClick={handleGenerateAdCopy} disabled={adCopyMutation.isPending} className="btn-primary">
              {adCopyMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Ad Copy
            </Button>
            <Button onClick={() => handleGenerateCaption("tiktok")} disabled={captionMutation.isPending} className="btn-primary">
              {captionMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Caption
            </Button>
          </div>
        </div>
      </Card>

      {hashtagsMutation.data && (
        <Card className="card-elevated p-6 animate-in">
          <h3 className="text-xl font-semibold mb-4">Trending Hashtags</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {hashtagsMutation.data.hashtags?.map((tag: string, idx: number) => (
              <div
                key={idx}
                onClick={() => copyToClipboard(`#${tag}`, `hashtag-${idx}`)}
                className="p-3 rounded-lg bg-muted hover:bg-primary/20 cursor-pointer transition text-sm text-center truncate"
              >
                #{tag}
              </div>
            ))}
          </div>
        </Card>
      )}

      {adCopyMutation.data && (
        <Card className="card-elevated p-6 animate-in">
          <h3 className="text-xl font-semibold mb-4">Ad Copy Variations</h3>
          <div className="space-y-2">
            {adCopyMutation.data.copies?.map((copy: string, idx: number) => (
              <div key={idx} className="p-4 rounded-lg bg-muted flex items-center justify-between">
                <p className="text-sm">{copy}</p>
                <button
                  onClick={() => copyToClipboard(copy, `copy-${idx}`)}
                  className="p-2 hover:bg-primary/20 rounded transition"
                >
                  {copiedId === `copy-${idx}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
