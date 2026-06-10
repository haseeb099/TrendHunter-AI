import type { LucideIcon } from "lucide-react";
import type { FeatureId } from "@shared/plans";
import {
  BarChart3,
  BookmarkIcon,
  CreditCard,
  DollarSign,
  Layers,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export type DashboardTabId =
  | "search"
  | "validate"
  | "competitors"
  | "profit"
  | "suppliers"
  | "social"
  | "marketgap"
  | "analytics"
  | "agent"
  | "pipeline"
  | "watchlist"
  | "billing"
  | "account";

export type DashboardNavItem = {
  id: DashboardTabId;
  label: string;
  description: string;
  icon: LucideIcon;
  requiredFeature?: FeatureId;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Research",
    items: [
      {
        id: "search",
        label: "Discover",
        description: "Trending products, search, and filters",
        icon: Search,
      },
      {
        id: "validate",
        label: "Validate",
        description: "AI viability and trend scoring",
        icon: Zap,
        requiredFeature: "validate",
      },
      {
        id: "competitors",
        label: "Competitors",
        description: "Pricing and positioning intelligence",
        icon: Users,
        requiredFeature: "competitors",
      },
      {
        id: "marketgap",
        label: "Market Gap",
        description: "Underserved niches and opportunities",
        icon: BarChart3,
        requiredFeature: "marketgap",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        id: "profit",
        label: "Profit Calc",
        description: "Margin, ROI, and landed cost",
        icon: DollarSign,
      },
      {
        id: "suppliers",
        label: "Suppliers",
        description: "Vet contacts and warehouse offers",
        icon: TrendingUp,
      },
      {
        id: "social",
        label: "Social Kit",
        description: "Hashtags, ad copy, and captions",
        icon: Sparkles,
        requiredFeature: "social",
      },
      {
        id: "agent",
        label: "AI Agent",
        description: "Research advisor chat",
        icon: MessageSquare,
        requiredFeature: "agent",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        id: "pipeline",
        label: "Pipeline",
        description: "Testing through launch stages",
        icon: Layers,
      },
      {
        id: "watchlist",
        label: "Watchlist",
        description: "Saved products to track",
        icon: BookmarkIcon,
      },
      {
        id: "analytics",
        label: "Analytics",
        description: "Performance and funnel metrics",
        icon: BarChart3,
        requiredFeature: "analytics",
      },
    ],
  },
  {
    label: "Account & Billing",
    items: [
      {
        id: "billing",
        label: "Billing",
        description: "Plans, usage, coupons, and subscription",
        icon: CreditCard,
      },
      {
        id: "account",
        label: "Account",
        description: "Profile, password, and security",
        icon: Settings,
      },
    ],
  },
];

export const dashboardNavItems: DashboardNavItem[] = dashboardNavGroups.flatMap(
  (group) => group.items
);

export function getDashboardPath(tab: DashboardTabId): string {
  return tab === "search" ? "/dashboard" : `/dashboard/${tab}`;
}

export function getActiveTab(path: string): DashboardTabId | null {
  const normalized = path.split("?")[0] ?? "/dashboard";
  if (normalized === "/dashboard") return "search";
  const tab = normalized.replace("/dashboard/", "") as DashboardTabId;
  return dashboardNavItems.some((item) => item.id === tab) ? tab : null;
}
