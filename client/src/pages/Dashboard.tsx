import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Search,
  Zap,
  Users,
  DollarSign,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Sparkles,
  BookmarkIcon,
  Layers,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import ProductSearch from "./ProductSearch";
import ProductValidation from "./ProductValidation";
import CompetitorSpy from "./CompetitorSpy";
import ProfitCalculator from "./ProfitCalculator";
import SupplierVetting from "./SupplierVetting";
import SocialMediaKit from "./SocialMediaKit";
import MarketGapFinder from "./MarketGapFinder";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AIAgent from "./AIAgent";
import ProductPipeline from "./ProductPipeline";
import Watchlist from "./Watchlist";

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const currentPath = location.split("?")[0];
  const activeTab = currentPath.replace("/dashboard/", "") || "search";

  const navigationItems = [
    { id: "search", label: "Search", icon: Search },
    { id: "validate", label: "Validate", icon: Zap },
    { id: "competitors", label: "Competitors", icon: Users },
    { id: "profit", label: "Profit Calc", icon: DollarSign },
    { id: "suppliers", label: "Suppliers", icon: TrendingUp },
    { id: "social", label: "Social Kit", icon: Sparkles },
    { id: "marketgap", label: "Market Gap", icon: BarChart3 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "agent", label: "AI Agent", icon: MessageSquare },
    { id: "pipeline", label: "Pipeline", icon: Layers },
    { id: "watchlist", label: "Watchlist", icon: BookmarkIcon },
  ];

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case "search":
        return <ProductSearch />;
      case "validate":
        return <ProductValidation />;
      case "competitors":
        return <CompetitorSpy />;
      case "profit":
        return <ProfitCalculator />;
      case "suppliers":
        return <SupplierVetting />;
      case "social":
        return <SocialMediaKit />;
      case "marketgap":
        return <MarketGapFinder />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "agent":
        return <AIAgent />;
      case "pipeline":
        return <ProductPipeline />;
      case "watchlist":
        return <Watchlist />;
      default:
        return <ProductSearch />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } border-r border-muted bg-card transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-muted flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">DropHunter</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-muted rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/dashboard/${item.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-muted p-4 space-y-2">
          {sidebarOpen && (
            <div className="px-2 py-2 text-xs">
              <p className="text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
}
