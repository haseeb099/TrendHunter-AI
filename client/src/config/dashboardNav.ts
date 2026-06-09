import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookmarkIcon,
  DollarSign,
  Layers,
  MessageSquare,
  Search,
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
  | "watchlist";

export type DashboardNavItem = {
  id: DashboardTabId;
  label: string;
  icon: LucideIcon;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Research",
    items: [
      { id: "search", label: "Search", icon: Search },
      { id: "validate", label: "Validate", icon: Zap },
      { id: "competitors", label: "Competitors", icon: Users },
      { id: "marketgap", label: "Market Gap", icon: BarChart3 },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "profit", label: "Profit Calc", icon: DollarSign },
      { id: "suppliers", label: "Suppliers", icon: TrendingUp },
      { id: "social", label: "Social Kit", icon: Sparkles },
      { id: "agent", label: "AI Agent", icon: MessageSquare },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "pipeline", label: "Pipeline", icon: Layers },
      { id: "watchlist", label: "Watchlist", icon: BookmarkIcon },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
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
