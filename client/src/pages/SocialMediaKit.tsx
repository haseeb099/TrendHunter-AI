import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { Sparkles, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function SocialMediaKit() {
  const [location] = useLocation();
  const [productTitle, setProductTitle] = useState("");
  const [productBenefit, setProductBenefit] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("productTitle") ?? params.get("title");
    const benefit = params.get("benefit");
    if (title) setProductTitle(title);
    if (benefit) setProductBenefit(benefit);
  }, [location]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tiktokCaption, setTiktokCaption] = useState<string | null>(null);
  const [instagramCaption, setInstagramCaption] = useState<string | null>(null);

  const aiConfig = trpc.system.getConfig.useQuery();
  const hashtagsMutation = trpc.social.generateHashtags.useMutation();
  const adCopyMutation = trpc.social.generateAdCopy.useMutation();
  const captionMutation = trpc.social.generateCaption.useMutation();
  const aiDisabled = aiConfig.data && !aiConfig.data.ai.configured;

  const handleGenerateHashtags = async () => {
    if (!productTitle.trim() || aiDisabled) return;
    try {
      await hashtagsMutation.mutateAsync({ productTitle });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate hashtags");
    }
  };

  const handleGenerateAdCopy = async () => {
    if (!productTitle.trim() || !productBenefit.trim() || aiDisabled) return;
    try {
      await adCopyMutation.mutateAsync({ productTitle, productBenefit });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate ad copy");
    }
  };

  const handleGenerateCaption = async (platform: "tiktok" | "instagram") => {
    if (!productTitle.trim() || aiDisabled) return;
    try {
      const result = await captionMutation.mutateAsync({ productTitle, platform });
      const text = typeof result.caption === "string" ? result.caption : "";
      if (platform === "tiktok") setTiktokCaption(text);
      else setInstagramCaption(text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate caption");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Media Kit"
        description="Generate AI-powered hashtags, ad copy, and captions"
      />

      {(hashtagsMutation.error || adCopyMutation.error || captionMutation.error) ? (
        <Alert variant="destructive">
          <AlertDescription>
            {hashtagsMutation.error?.message ??
              adCopyMutation.error?.message ??
              captionMutation.error?.message}
          </AlertDescription>
        </Alert>
      ) : null}

      {aiDisabled ? (
        <Alert>
          <AlertDescription>Add OPENAI_API_KEY to generate social content.</AlertDescription>
        </Alert>
      ) : null}

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
            <Button onClick={handleGenerateHashtags} disabled={hashtagsMutation.isPending || aiDisabled} >
              {hashtagsMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Hashtags
            </Button>
            <Button onClick={handleGenerateAdCopy} disabled={adCopyMutation.isPending || aiDisabled} >
              {adCopyMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Ad Copy
            </Button>
            <Button onClick={() => handleGenerateCaption("tiktok")} disabled={captionMutation.isPending || aiDisabled} >
              {captionMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              TikTok
            </Button>
            <Button onClick={() => handleGenerateCaption("instagram")} disabled={captionMutation.isPending || aiDisabled} >
              {captionMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Instagram
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

      {(tiktokCaption || instagramCaption) && (
        <div className="grid md:grid-cols-2 gap-4 animate-in">
          {tiktokCaption ? (
            <Card className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">TikTok Caption</h3>
                <button
                  onClick={() => copyToClipboard(tiktokCaption, "tiktok-cap")}
                  className="p-2 hover:bg-primary/20 rounded transition"
                >
                  {copiedId === "tiktok-cap" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{tiktokCaption}</p>
            </Card>
          ) : null}
          {instagramCaption ? (
            <Card className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Instagram Caption</h3>
                <button
                  onClick={() => copyToClipboard(instagramCaption, "ig-cap")}
                  className="p-2 hover:bg-primary/20 rounded transition"
                >
                  {copiedId === "ig-cap" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{instagramCaption}</p>
            </Card>
          ) : null}
        </div>
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
