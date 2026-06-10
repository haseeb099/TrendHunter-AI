import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";
import { FormSection } from "@/components/workspace/FormSection";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import { Sparkles, Copy, Check, Hash, Megaphone, Instagram } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SocialMediaKit() {
  const [location] = useLocation();
  const [productTitle, setProductTitle] = useState("");
  const [productBenefit, setProductBenefit] = useState("");
  const [activeTab, setActiveTab] = useState("hashtags");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tiktokCaption, setTiktokCaption] = useState<string | null>(null);
  const [instagramCaption, setInstagramCaption] = useState<string | null>(null);

  const aiConfig = trpc.system.getConfig.useQuery();
  const hashtagsMutation = trpc.social.generateHashtags.useMutation();
  const adCopyMutation = trpc.social.generateAdCopy.useMutation();
  const captionMutation = trpc.social.generateCaption.useMutation();
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("productTitle") ?? params.get("title");
    const benefit = params.get("benefit");
    if (title) setProductTitle(title);
    if (benefit) setProductBenefit(benefit);
  }, [location]);

  const handleGenerateHashtags = async () => {
    if (!productTitle.trim() || aiDisabled) return;
    try {
      await hashtagsMutation.mutateAsync({ productTitle });
      setActiveTab("hashtags");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate hashtags");
    }
  };

  const handleGenerateAdCopy = async () => {
    if (!productTitle.trim() || !productBenefit.trim() || aiDisabled) return;
    try {
      await adCopyMutation.mutateAsync({ productTitle, productBenefit });
      setActiveTab("ads");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate ad copy");
    }
  };

  const handleGenerateCaption = async (platform: "tiktok" | "instagram") => {
    if (!productTitle.trim() || aiDisabled) return;
    try {
      const result = await captionMutation.mutateAsync({ productTitle, platform });
      const text = typeof result.caption === "string" ? result.caption : "";
      if (platform === "tiktok") {
        setTiktokCaption(text);
        setActiveTab("tiktok");
      } else {
        setInstagramCaption(text);
        setActiveTab("instagram");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate caption");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasOutput =
    hashtagsMutation.data ||
    adCopyMutation.data ||
    tiktokCaption ||
    instagramCaption;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Social Media Kit"
        description="Generate platform-ready hashtags, ad hooks, and captions — pre-filled from Discover product cards."
      />

      <AiFeatureGate disabled={aiDisabled} feature="Social content generation" />

      {(hashtagsMutation.error || adCopyMutation.error || captionMutation.error) ? (
        <Alert variant="destructive">
          <AlertDescription>
            {hashtagsMutation.error?.message ??
              adCopyMutation.error?.message ??
              captionMutation.error?.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <FormSection
        title="Product brief"
        description="Title and one key benefit drive all generated content."
        icon={Sparkles}
      >
        <FieldLabel htmlFor="social-title">Product title</FieldLabel>
        <Input
          id="social-title"
          placeholder="e.g. Magnetic wireless charger"
          value={productTitle}
          onChange={(e) => setProductTitle(e.target.value)}
          className="input-elegant"
        />
        <FieldLabel htmlFor="social-benefit" hint="Used for ad copy variations">
          Key benefit
        </FieldLabel>
        <Input
          id="social-benefit"
          placeholder="e.g. Fast charge, slim design, works through cases"
          value={productBenefit}
          onChange={(e) => setProductBenefit(e.target.value)}
          className="input-elegant"
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateHashtags}
            disabled={hashtagsMutation.isPending || aiDisabled}
          >
            {hashtagsMutation.isPending ? <Spinner className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
            Hashtags
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateAdCopy}
            disabled={adCopyMutation.isPending || aiDisabled}
          >
            {adCopyMutation.isPending ? <Spinner className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
            Ad copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleGenerateCaption("tiktok")}
            disabled={captionMutation.isPending || aiDisabled}
          >
            TikTok caption
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleGenerateCaption("instagram")}
            disabled={captionMutation.isPending || aiDisabled}
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </Button>
        </div>
      </FormSection>

      {hasOutput ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="hashtags" disabled={!hashtagsMutation.data}>
              Hashtags
            </TabsTrigger>
            <TabsTrigger value="ads" disabled={!adCopyMutation.data}>
              Ad copy
            </TabsTrigger>
            <TabsTrigger value="tiktok" disabled={!tiktokCaption}>
              TikTok
            </TabsTrigger>
            <TabsTrigger value="instagram" disabled={!instagramCaption}>
              Instagram
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hashtags">
            {hashtagsMutation.data ? (
              <div className="card-elevated p-5 sm:p-6">
                <p className="metric-label mb-4">Trending hashtags</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {hashtagsMutation.data.hashtags?.map((tag: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => copyToClipboard(`#${tag}`, `hashtag-${idx}`)}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-center truncate hover:bg-muted/60 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="ads">
            {adCopyMutation.data ? (
              <div className="card-elevated p-5 sm:p-6 space-y-3">
                <p className="metric-label mb-2">Ad copy variations</p>
                {adCopyMutation.data.copies?.map((copy: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border p-4 bg-muted/20"
                  >
                    <p className="text-sm leading-relaxed">{copy}</p>
                    <CopyButton
                      copied={copiedId === `copy-${idx}`}
                      onClick={() => copyToClipboard(copy, `copy-${idx}`)}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="tiktok">
            {tiktokCaption ? (
              <CaptionBlock
                title="TikTok caption"
                text={tiktokCaption}
                copyId="tiktok-cap"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="instagram">
            {instagramCaption ? (
              <CaptionBlock
                title="Instagram caption"
                text={instagramCaption}
                copyId="ig-cap"
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="product-panel-empty">
          <div className="product-panel-empty-icon">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <p className="font-medium text-sm">No content generated yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter a product title and generate hashtags, ad hooks, or platform captions above.
          </p>
        </div>
      )}
    </div>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg p-2 hover:bg-muted/60 transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CaptionBlock({
  title,
  text,
  copyId,
  copiedId,
  onCopy,
}: {
  title: string;
  text: string;
  copyId: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="card-elevated p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display font-semibold">{title}</p>
        <CopyButton copied={copiedId === copyId} onClick={() => onCopy(text, copyId)} />
      </div>
      <p className={cn("text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground")}>{text}</p>
    </div>
  );
}
