import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { AiFeatureGate } from "@/components/workspace/AiFeatureGate";
import { FormSection } from "@/components/workspace/FormSection";
import { FieldLabel } from "@/components/workspace/FieldLabel";
import { SocialKitUsageBar } from "@/components/social/SocialKitUsageBar";
import { ProductIntelligenceHub } from "@/components/intelligence/ProductIntelligenceHub";
import { DataFreshnessBadge } from "@/components/intelligence/DataFreshnessBadge";
import {
  Sparkles,
  Copy,
  Check,
  Hash,
  Megaphone,
  Instagram,
  Save,
  Trash2,
  Download,
  Zap,
  FolderOpen,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RegionCode } from "@shared/searchTypes";
import type { SocialKitPayload } from "@shared/socialKitTypes";

const EMPTY_KIT: SocialKitPayload = {};

export default function SocialMediaKit() {
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const [productTitle, setProductTitle] = useState("");
  const [productBenefit, setProductBenefit] = useState("");
  const [region, setRegion] = useState<RegionCode>("US");
  const [productId, setProductId] = useState<string | undefined>();
  const [liveData, setLiveData] = useState(false);
  const [kit, setKit] = useState<SocialKitPayload>(EMPTY_KIT);
  const [activeTab, setActiveTab] = useState("hashtags");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [kitName, setKitName] = useState("");
  const [loadedKitId, setLoadedKitId] = useState<number | null>(null);
  const [showIntel, setShowIntel] = useState(true);

  const aiConfig = trpc.system.getConfig.useQuery();
  const savedQuery = trpc.social.listSavedKits.useQuery();
  const aiDisabled = Boolean(aiConfig.data && !aiConfig.data.ai.configured);

  const hashtagsMutation = trpc.social.generateHashtags.useMutation({
    onSuccess: (d) => {
      setKit((k) => ({ ...k, hashtags: d.hashtags }));
      if (d.creditsUsed) void utils.credits.getWallet.invalidate();
      void utils.auth.me.invalidate();
    },
  });
  const adCopyMutation = trpc.social.generateAdCopy.useMutation({
    onSuccess: (d) => {
      setKit((k) => ({ ...k, copies: d.copies }));
      void utils.auth.me.invalidate();
    },
  });
  const captionMutation = trpc.social.generateCaption.useMutation({
    onSuccess: (d, vars) => {
      const text = typeof d.caption === "string" ? d.caption : "";
      setKit((k) =>
        vars.platform === "tiktok"
          ? { ...k, tiktokCaption: text }
          : { ...k, instagramCaption: text }
      );
      void utils.auth.me.invalidate();
    },
  });
  const hooksMutation = trpc.social.generateHooks.useMutation({
    onSuccess: (d) => {
      setKit((k) => ({ ...k, hooks: d.hooks }));
      void utils.auth.me.invalidate();
    },
  });
  const calendarMutation = trpc.social.generateContentCalendar.useMutation({
    onSuccess: (d) => {
      setKit((k) => ({ ...k, days: d.days }));
      void utils.auth.me.invalidate();
    },
  });
  const seoMutation = trpc.social.generateSeoBlock.useMutation({
    onSuccess: (d) => {
      setKit((k) => ({ ...k, seo: d }));
      void utils.auth.me.invalidate();
    },
  });
  const fullKitMutation = trpc.social.generateFullKit.useMutation({
    onSuccess: (d) => {
      setKit(d.kit);
      setActiveTab("hashtags");
      if (d.creditsUsed) void utils.credits.getWallet.invalidate();
      void utils.auth.me.invalidate();
      toast.success("Full kit generated");
    },
  });
  const saveMutation = trpc.social.saveKit.useMutation({
    onSuccess: async (d) => {
      await utils.social.listSavedKits.invalidate();
      await utils.social.getKitLimits.invalidate();
      setLoadedKitId(d.id);
      toast.success(d.updated ? "Kit updated" : "Kit saved");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.social.deleteSavedKit.useMutation({
    onSuccess: async () => {
      await utils.social.listSavedKits.invalidate();
      await utils.social.getKitLimits.invalidate();
      if (loadedKitId) setLoadedKitId(null);
      toast.success("Kit deleted");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("productTitle") ?? params.get("title");
    const benefit = params.get("benefit");
    const reg = params.get("region");
    const pid = params.get("productId");
    if (title) setProductTitle(title);
    if (benefit) setProductBenefit(benefit);
    if (reg) setRegion(reg as RegionCode);
    if (pid) setProductId(pid);
  }, [location]);

  const isPending =
    hashtagsMutation.isPending ||
    adCopyMutation.isPending ||
    captionMutation.isPending ||
    hooksMutation.isPending ||
    calendarMutation.isPending ||
    seoMutation.isPending ||
    fullKitMutation.isPending;

  const hasOutput = Boolean(
    kit.hashtags?.length ||
      kit.copies?.length ||
      kit.hooks?.length ||
      kit.days?.length ||
      kit.seo ||
      kit.tiktokCaption ||
      kit.instagramCaption
  );

  const defaultKitName = useMemo(
    () => (productTitle.trim() ? `${productTitle.trim().slice(0, 40)} kit` : "My social kit"),
    [productTitle]
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportAll = () => {
    const lines: string[] = [`# ${productTitle}`, productBenefit ? `Benefit: ${productBenefit}` : "", ""];
    if (kit.hashtags?.length) lines.push("## Hashtags", kit.hashtags.map((t) => `#${t}`).join(" "), "");
    if (kit.hooks?.length) lines.push("## Hooks", ...kit.hooks, "");
    if (kit.copies?.length) lines.push("## Ad copy", ...kit.copies, "");
    if (kit.tiktokCaption) lines.push("## TikTok", kit.tiktokCaption, "");
    if (kit.instagramCaption) lines.push("## Instagram", kit.instagramCaption, "");
    if (kit.seo) {
      lines.push("## SEO", kit.seo.title, kit.seo.metaDescription, ...kit.seo.bulletPoints, "");
    }
    if (kit.days?.length) {
      lines.push("## Calendar");
      kit.days.forEach((d) => lines.push(`Day ${d.day} (${d.platform}): ${d.topic} — ${d.format}`));
    }
    copyToClipboard(lines.join("\n"), "export-all");
  };

  const loadSavedKit = async (id: number) => {
    try {
      const data = await utils.social.getSavedKit.fetch({ id });
      setProductTitle(data.productTitle);
      setProductBenefit(data.productBenefit ?? "");
      if (data.region) setRegion(data.region as RegionCode);
      setProductId(data.productId ?? undefined);
      setKit(data.payload);
      setKitName(data.name);
      setLoadedKitId(data.id);
      setActiveTab("hashtags");
      toast.success("Kit loaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load kit");
    }
  };

  const handleSave = () => {
    if (!hasOutput) {
      toast.error("Generate content before saving");
      return;
    }
    saveMutation.mutate({
      id: loadedKitId ?? undefined,
      name: kitName.trim() || defaultKitName,
      productTitle,
      productBenefit: productBenefit || undefined,
      region,
      productId,
      payload: { ...kit, generatedAt: new Date().toISOString() },
    });
  };

  const handleFullKit = async () => {
    if (!productTitle.trim() || aiDisabled) return;
    try {
      await fullKitMutation.mutateAsync({
        productTitle,
        productBenefit: productBenefit || undefined,
        region,
        live: liveData,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    }
  };

  const mutationError =
    hashtagsMutation.error ??
    adCopyMutation.error ??
    fullKitMutation.error ??
    hooksMutation.error;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Social Media Kit"
        description="LLM-powered content enriched with cached Google Trends and Meta Ad data. Each generator uses 1 AI call; full kit uses 1 call total."
      />

      <SocialKitUsageBar />
      <AiFeatureGate disabled={aiDisabled} feature="Social content generation" />

      {mutationError ? (
        <Alert variant="destructive">
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <FormSection
            title="Product brief"
            description="Title and benefit drive all generators. Trend and ad context is injected automatically."
            icon={Sparkles}
            footer={
              <div className="flex flex-wrap gap-2 w-full">
                <Button
                  onClick={handleFullKit}
                  disabled={isPending || aiDisabled || !productTitle.trim()}
                  className="flex-1 sm:flex-none"
                >
                  {fullKitMutation.isPending ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate full kit (1 AI call)
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={!hasOutput || saveMutation.isPending}
                >
                  <Save className="w-4 h-4" />
                  {loadedKitId ? "Update saved" : "Save kit"}
                </Button>
                {hasOutput ? (
                  <Button variant="outline" onClick={exportAll}>
                    <Download className="w-4 h-4" />
                    Export all
                  </Button>
                ) : null}
              </div>
            }
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <FieldLabel htmlFor="social-title">Product title</FieldLabel>
                <Input
                  id="social-title"
                  placeholder="e.g. Magnetic wireless charger"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  className="input-elegant"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FieldLabel htmlFor="social-benefit" hint="Used for ad copy & SEO">
                  Key benefit
                </FieldLabel>
                <Input
                  id="social-benefit"
                  placeholder="e.g. Fast charge, slim design"
                  value={productBenefit}
                  onChange={(e) => setProductBenefit(e.target.value)}
                  className="input-elegant"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Region</FieldLabel>
                <Select value={region} onValueChange={(v) => setRegion(v as RegionCode)}>
                  <SelectTrigger className="input-elegant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="EU">Europe</SelectItem>
                    <SelectItem value="GLOBAL">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 h-10 bg-card flex-1">
                  <Switch id="social-live" checked={liveData} onCheckedChange={setLiveData} />
                  <Label htmlFor="social-live" className="text-xs cursor-pointer flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Live trends (+1 credit)
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <GenBtn
                label="Hashtags"
                icon={Hash}
                pending={hashtagsMutation.isPending}
                disabled={aiDisabled || !productTitle.trim()}
                onClick={async () => {
                  try {
                    await hashtagsMutation.mutateAsync({
                      productTitle,
                      region,
                      live: liveData,
                    });
                    setActiveTab("hashtags");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
              <GenBtn
                label="Ad copy"
                icon={Megaphone}
                pending={adCopyMutation.isPending}
                disabled={aiDisabled || !productTitle.trim() || !productBenefit.trim()}
                onClick={async () => {
                  try {
                    await adCopyMutation.mutateAsync({
                      productTitle,
                      productBenefit,
                      region,
                    });
                    setActiveTab("ads");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
              <GenBtn
                label="TikTok"
                pending={captionMutation.isPending}
                disabled={aiDisabled || !productTitle.trim()}
                onClick={async () => {
                  try {
                    await captionMutation.mutateAsync({
                      productTitle,
                      platform: "tiktok",
                      region,
                    });
                    setActiveTab("tiktok");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
              <GenBtn
                label="Instagram"
                icon={Instagram}
                pending={captionMutation.isPending}
                disabled={aiDisabled || !productTitle.trim()}
                onClick={async () => {
                  try {
                    await captionMutation.mutateAsync({
                      productTitle,
                      platform: "instagram",
                      region,
                    });
                    setActiveTab("instagram");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
              <GenBtn
                label="Hooks"
                pending={hooksMutation.isPending}
                disabled={aiDisabled || !productTitle.trim()}
                onClick={async () => {
                  try {
                    await hooksMutation.mutateAsync({ productTitle, region });
                    setActiveTab("hooks");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
              <GenBtn
                label="7-day plan"
                pending={calendarMutation.isPending}
                disabled={aiDisabled || !productTitle.trim()}
                onClick={async () => {
                  try {
                    await calendarMutation.mutateAsync({ productTitle, region });
                    setActiveTab("calendar");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
              <GenBtn
                label="SEO"
                pending={seoMutation.isPending}
                disabled={aiDisabled || !productTitle.trim()}
                onClick={async () => {
                  try {
                    await seoMutation.mutateAsync({
                      productTitle,
                      benefit: productBenefit,
                    });
                    setActiveTab("seo");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              />
            </div>

            {hasOutput ? (
              <div className="space-y-2 pt-2">
                <FieldLabel htmlFor="kit-name">Save as</FieldLabel>
                <Input
                  id="kit-name"
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  placeholder={defaultKitName}
                  className="input-elegant"
                />
              </div>
            ) : null}
          </FormSection>

          {showIntel && productTitle.trim() ? (
            <section className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display font-semibold text-sm">Live market data</p>
                <Button size="sm" variant="ghost" onClick={() => setShowIntel(false)}>
                  Hide
                </Button>
              </div>
              <ProductIntelligenceHub
                keyword={productTitle}
                region={region}
                productId={productId}
                productBenefit={productBenefit}
                compact
              />
            </section>
          ) : !showIntel ? (
            <Button size="sm" variant="outline" onClick={() => setShowIntel(true)}>
              Show market intelligence
            </Button>
          ) : null}

          {hasOutput ? (
            <div className="space-y-3">
              {!liveData ? (
                <div className="flex justify-end">
                  <DataFreshnessBadge synthetic />
                </div>
              ) : null}
              <KitOutputTabs
                kit={kit}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            </div>
          ) : (
            <div className="product-panel-empty">
              <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-2" />
              <p className="font-medium text-sm">No content yet</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Generate a full kit in one click, or run individual generators. Content uses OpenAI
                with your cached trend and Meta ad context.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card-elevated p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Saved kits</p>
            </div>
            {savedQuery.isLoading ? (
              <Spinner className="w-5 h-5 mx-auto" />
            ) : savedQuery.data && savedQuery.data.length > 0 ? (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                {savedQuery.data.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      "rounded-lg border p-3 text-sm space-y-2",
                      loadedKitId === s.id ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <button
                      type="button"
                      className="text-left w-full font-medium line-clamp-1 hover:text-primary"
                      onClick={() => loadSavedKit(s.id)}
                    >
                      {s.name}
                    </button>
                    <p className="text-xs text-muted-foreground line-clamp-1">{s.productTitle}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => loadSavedKit(s.id)}>
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => deleteMutation.mutate({ id: s.id })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Save kits to reload product briefs and content later.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function GenBtn({
  label,
  icon: Icon,
  pending,
  disabled,
  onClick,
}: {
  label: string;
  icon?: typeof Hash;
  pending?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={disabled || pending}>
      {pending ? <Spinner className="w-4 h-4" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {label}
    </Button>
  );
}

function KitOutputTabs({
  kit,
  activeTab,
  setActiveTab,
  copiedId,
  onCopy,
}: {
  kit: SocialKitPayload;
  activeTab: string;
  setActiveTab: (v: string) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="w-full flex flex-wrap h-auto gap-1">
        <TabsTrigger value="hashtags" disabled={!kit.hashtags?.length}>
          Hashtags
        </TabsTrigger>
        <TabsTrigger value="ads" disabled={!kit.copies?.length}>
          Ad copy
        </TabsTrigger>
        <TabsTrigger value="tiktok" disabled={!kit.tiktokCaption}>
          TikTok
        </TabsTrigger>
        <TabsTrigger value="instagram" disabled={!kit.instagramCaption}>
          Instagram
        </TabsTrigger>
        <TabsTrigger value="hooks" disabled={!kit.hooks?.length}>
          Hooks
        </TabsTrigger>
        <TabsTrigger value="calendar" disabled={!kit.days?.length}>
          Calendar
        </TabsTrigger>
        <TabsTrigger value="seo" disabled={!kit.seo}>
          SEO
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hashtags">
        {kit.hashtags?.length ? (
          <div className="card-elevated p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {kit.hashtags.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onCopy(`#${tag}`, `h-${idx}`)}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-muted/60 truncate"
              >
                #{tag}
              </button>
            ))}
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="ads">
        {kit.copies?.map((copy, idx) => (
          <div key={idx} className="card-elevated p-4 mb-2 flex justify-between gap-2 text-sm">
            <span>{copy}</span>
            <CopyBtn copied={copiedId === `c-${idx}`} onClick={() => onCopy(copy, `c-${idx}`)} />
          </div>
        ))}
      </TabsContent>

      <TabsContent value="tiktok">
        {kit.tiktokCaption ? (
          <CaptionBlock text={kit.tiktokCaption} title="TikTok" copyId="tt" copiedId={copiedId} onCopy={onCopy} />
        ) : null}
      </TabsContent>

      <TabsContent value="instagram">
        {kit.instagramCaption ? (
          <CaptionBlock text={kit.instagramCaption} title="Instagram" copyId="ig" copiedId={copiedId} onCopy={onCopy} />
        ) : null}
      </TabsContent>

      <TabsContent value="hooks">
        {kit.hooks?.map((hook, idx) => (
          <div key={idx} className="card-elevated p-3 mb-2 flex justify-between text-sm">
            <span>{hook}</span>
            <CopyBtn copied={copiedId === `hk-${idx}`} onClick={() => onCopy(hook, `hk-${idx}`)} />
          </div>
        ))}
      </TabsContent>

      <TabsContent value="calendar">
        {kit.days?.map((day) => (
          <div key={day.day} className="card-elevated p-3 mb-2 text-sm">
            <p className="font-medium">
              Day {day.day} · {day.platform}
            </p>
            <p>{day.topic}</p>
            <p className="text-xs text-muted-foreground">{day.format}</p>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="seo">
        {kit.seo ? (
          <div className="card-elevated p-5 space-y-2 text-sm">
            <p className="font-medium">{kit.seo.title}</p>
            <p className="text-muted-foreground">{kit.seo.metaDescription}</p>
            <ul className="list-disc pl-5">
              {kit.seo.bulletPoints.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 p-2 rounded-lg hover:bg-muted/60">
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
    <div className="card-elevated p-5">
      <div className="flex justify-between mb-3">
        <p className="font-semibold">{title}</p>
        <CopyBtn copied={copiedId === copyId} onClick={() => onCopy(text, copyId)} />
      </div>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{text}</p>
    </div>
  );
}
