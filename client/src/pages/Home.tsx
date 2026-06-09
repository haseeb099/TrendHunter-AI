import { useState } from "react";
import type { ProductSearchResult } from "@shared/searchTypes";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppLogo } from "@/components/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import type { ProductDrawerTab } from "@/components/product-workspace/types";
import type { ProductOffer } from "@shared/searchTypes";
import { Spinner } from "@/components/ui/spinner";
import { getLoginUrl, getRegisterUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import type { RegionCode } from "@shared/searchTypes";
import {
  Search,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Check,
  Layers,
  BookmarkIcon,
  LineChart,
} from "lucide-react";
import { Link } from "wouter";

const features = [
  {
    icon: Search,
    title: "Unified marketplace search",
    desc: "One query across eBay, Amazon, retail, and TikTok Shop with shared filters.",
  },
  {
    icon: Zap,
    title: "AI validation scores",
    desc: "Trend momentum, saturation, margin potential, and supplier signals in one view.",
  },
  {
    icon: Users,
    title: "Competitor intelligence",
    desc: "Pricing, reviews, and velocity without leaving your workspace.",
  },
  {
    icon: DollarSign,
    title: "Profit modeling",
    desc: "Landed cost, ROI, and break-even before you commit capital.",
  },
  {
    icon: TrendingUp,
    title: "Market gap finder",
    desc: "Surface niches with demand and manageable competition.",
  },
  {
    icon: MessageSquare,
    title: "Research agent",
    desc: "Ask follow-ups and get structured recommendations in context.",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "$29",
    desc: "For solo sellers validating first niches.",
    features: ["Basic search", "100 searches / mo", "Margin calculator"],
  },
  {
    name: "Pro",
    price: "$79",
    desc: "For operators scaling across channels.",
    features: ["All platforms", "Competitor spy", "AI scoring", "500 searches / mo"],
    highlight: true,
  },
  {
    name: "Agency",
    price: "$199",
    desc: "For teams managing multiple brands.",
    features: ["Multi-client", "White-label reports", "Unlimited searches"],
  },
];

function DashboardPreview() {
  return (
    <div className="dashboard-preview fade-up">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-2 text-[11px] text-muted-foreground">app.drophunter.ai</span>
      </div>
      <div className="grid grid-cols-[140px_1fr] min-h-[280px]">
        <div className="border-r border-border bg-sidebar p-3 space-y-2 hidden sm:block">
          <div className="h-8 rounded-lg bg-primary/10" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-7 rounded-md ${i === 1 ? "bg-primary/15" : "bg-muted/60"}`} />
          ))}
        </div>
        <div className="p-4 sm:p-5 space-y-4 bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-6 w-40 rounded bg-muted/80" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-primary/15" />
          </div>
          <div className="h-10 rounded-lg border border-border bg-background" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="h-16 rounded-md bg-muted/50" />
                <div className="h-2.5 w-full rounded bg-muted" />
                <div className="h-2.5 w-2/3 rounded bg-muted/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendingSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const regionsQuery = trpc.trending.getRegions.useQuery();
  const defaultRegion = (regionsQuery.data?.defaultRegion ?? "US") as RegionCode;
  const [region, setRegion] = useState<RegionCode | null>(null);
  const [category, setCategory] = useState<string | undefined>();
  const [detailProduct, setDetailProduct] = useState<ProductSearchResult | null>(null);
  const [drawerTab, setDrawerTab] = useState<ProductDrawerTab>("overview");
  const activeRegion = region ?? defaultRegion;

  const openProductDrawer = (product: ProductSearchResult, tab: ProductDrawerTab = "overview") => {
    setDetailProduct(product);
    setDrawerTab(tab);
  };
  const categoriesQuery = trpc.trending.getCategories.useQuery({ region: activeRegion });
  const trendingQuery = trpc.trending.getFeed.useQuery({ region: activeRegion, category });

  const addToWatchlist = trpc.watchlist.addToWatchlist.useMutation({
    onSuccess: async () => {
      await utils.watchlist.getWatchlist.invalidate();
      toast.success("Added to watchlist");
    },
    onError: (e) => toast.error(e.message),
  });
  const addToPipeline = trpc.pipeline.createPipelineItem.useMutation({
    onSuccess: async () => {
      await utils.pipeline.getPipelineItems.invalidate();
      toast.success("Added to pipeline");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = (product: ProductSearchResult, offer?: ProductOffer) => {
    addToWatchlist.mutate({
      productId: product.id,
      productTitle: product.title,
      productImage: product.image ?? undefined,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl ?? undefined,
      region: product.region,
      supplierPlatform: offer?.supplierPlatform,
      landedCost: offer?.landedCost,
      notes: offer
        ? `Best offer: ${offer.supplierPlatform} · landed ${offer.landedCost.toFixed(2)}`
        : undefined,
    });
  };

  const handlePipeline = (product: ProductSearchResult, offer?: ProductOffer) => {
    addToPipeline.mutate({
      productId: product.id,
      productTitle: product.title,
      productImage: product.image ?? undefined,
      platform: product.platform,
      price: product.price,
      sourceUrl: product.sourceUrl ?? undefined,
      region: product.region,
      supplierPlatform: offer?.supplierPlatform,
      landedCost: offer?.landedCost,
      stage: "testing",
    });
  };


  return (
    <section id="trending" className="border-b border-border bg-muted/15 py-20 md:py-24">
      <div className="container">
        <div className="max-w-2xl mb-8">
          <p className="eyebrow mb-3">Trending now</p>
          <h2 className="section-title mb-3">What&apos;s hot across marketplaces</h2>
          <p className="text-muted-foreground">
            Region-aware trending products — sign in to save and add to your pipeline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {(regionsQuery.data?.regions ?? [{ code: "US", label: "United States" }]).map((r) => (
            <Button
              key={r.code}
              size="sm"
              variant={activeRegion === r.code ? "default" : "outline"}
              onClick={() => setRegion(r.code as RegionCode)}
            >
              {r.label}
            </Button>
          ))}
          {trendingQuery.data?.isDemo ? (
            <Badge variant="outline" className="ml-auto self-center">
              Demo data
            </Badge>
          ) : null}
        </div>

        {categoriesQuery.data?.categories && categoriesQuery.data.categories.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              size="sm"
              variant={!category ? "secondary" : "ghost"}
              onClick={() => setCategory(undefined)}
            >
              All
            </Button>
            {categoriesQuery.data.categories.map((c) => (
              <Button
                key={c.value}
                size="sm"
                variant={category === c.value ? "secondary" : "ghost"}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        ) : null}

        {trendingQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trendingQuery.data?.results.slice(0, 8).map((product) => (
              <ProductCard
                key={`${product.platform}-${product.id}`}
                product={product}
                showTrendBadge
                onViewDetails={openProductDrawer}
                onSave={isAuthenticated ? handleSave : undefined}
                onPipeline={isAuthenticated ? (p) => handlePipeline(p) : undefined}
                savePending={addToWatchlist.isPending}
                pipelinePending={addToPipeline.isPending}
              />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href={isAuthenticated ? "/dashboard" : getRegisterUrl()}>
            <Button variant="outline">
              {isAuthenticated ? "Explore all in dashboard" : "Sign in to save products"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      <ProductDetailDrawer
        product={detailProduct}
        open={Boolean(detailProduct)}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        initialTab={drawerTab}
        onAddToPipeline={isAuthenticated ? handlePipeline : undefined}
        onAddToWatchlist={isAuthenticated ? handleSave : undefined}
        pipelinePending={addToPipeline.isPending}
        savePending={addToWatchlist.isPending}
      />
    </section>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="container flex h-[4.25rem] items-center justify-between">
          <Link href="/">
            <AppLogo size="sm" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href={getLoginUrl()} className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href={getRegisterUrl()}>
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero-mesh border-b border-border">
        <div className="container py-16 md:py-24 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="max-w-xl fade-up">
              <p className="eyebrow mb-5">
                <LineChart className="h-3.5 w-3.5" />
                Product intelligence platform
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.06] text-balance mb-6">
                Hunt winning products with clarity, not chaos
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                DropHunter brings marketplace search, AI validation, pipeline tracking,
                and analytics into one calm, professional workspace.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={isAuthenticated ? "/dashboard" : getRegisterUrl()}>
                  <Button size="lg" className="w-full sm:w-auto min-w-[170px]">
                    {isAuthenticated ? "Open workspace" : "Start free"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[170px]">
                    Explore features
                  </Button>
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm">
                {[
                  { value: "4+", label: "Marketplaces" },
                  { value: "11", label: "Research tools" },
                  { value: "1", label: "Workspace" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="stat-value text-xl">{s.value}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <DashboardPreview />
          </div>
        </div>
      </section>

      <TrendingSection isAuthenticated={isAuthenticated} />

      <section id="features" className="container py-20 md:py-24">
        <div className="max-w-2xl mb-12">
          <p className="eyebrow mb-3">Capabilities</p>
          <h2 className="section-title mb-3">Built for serious product research</h2>
          <p className="text-muted-foreground leading-relaxed">
            Every tool you need from first keyword to launch decision — designed to
            feel fast, focused, and trustworthy.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <article key={feature.title} className="surface-interactive p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          {[
            { icon: Layers, title: "Pipeline management", desc: "Track products from testing through scale." },
            { icon: BookmarkIcon, title: "Watchlist & notes", desc: "Save opportunities and revisit on your schedule." },
            { icon: BarChart3, title: "Analytics dashboard", desc: "Pipeline health and profit trends at a glance." },
          ].map((item) => (
            <article key={item.title} className="surface p-5 flex gap-4 items-start">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-border bg-muted/25 py-20 md:py-24">
        <div className="container">
          <div className="max-w-2xl mb-12">
            <p className="eyebrow mb-3">Pricing</p>
            <h2 className="section-title mb-3">Simple plans, room to grow</h2>
            <p className="text-muted-foreground">Upgrade when your research volume demands it.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl">
            {tiers.map((tier) => (
              <article
                key={tier.name}
                className={`surface p-6 flex flex-col ${tier.highlight ? "ring-1 ring-primary/30 shadow-md" : ""}`}
              >
                {tier.highlight ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-3">
                    Recommended
                  </span>
                ) : (
                  <span className="h-5 mb-3 block" />
                )}
                <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-5">{tier.desc}</p>
                <div className="mb-6">
                  <span className="stat-value text-3xl">{tier.price}</span>
                  <span className="text-sm text-muted-foreground"> / mo</span>
                </div>
                <ul className="space-y-2.5 flex-1 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={isAuthenticated ? "/dashboard" : getRegisterUrl()}>
                  <Button variant={tier.highlight ? "default" : "outline"} className="w-full">
                    Get started
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-20">
        <div className="surface-elevated p-10 md:p-14 text-center max-w-3xl mx-auto">
          <h2 className="section-title mb-3">Start researching with confidence</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Create your account and explore the full workspace in minutes.
          </p>
          <Link href={isAuthenticated ? "/dashboard" : getRegisterUrl()}>
            <Button size="lg">
              {isAuthenticated ? "Open workspace" : "Create free account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <AppLogo size="sm" />
          <p>© 2026 DropHunter. Product research for modern sellers.</p>
        </div>
      </footer>
    </div>
  );
}
