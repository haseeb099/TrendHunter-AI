import DashboardLayout from "@/components/DashboardLayout";
import { PlanFeatureGate } from "@/components/workspace/PlanFeatureGate";
import { usePlan } from "@/_core/hooks/usePlan";
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
import Billing from "./Billing";
import AccountSettings from "./AccountSettings";
import IntelligenceCenter from "./IntelligenceCenter";
import TrendPulsePage from "./TrendPulsePage";
import AdRadarPage from "./AdRadarPage";
import TikTokRadarPage from "./TikTokRadarPage";
import TikTokShopPage from "./TikTokShopPage";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getActiveTab, getDashboardPath, type DashboardTabId } from "@/config/dashboardNav";
import { ALWAYS_ACCESSIBLE_TABS, TAB_REQUIRED_FEATURE } from "@shared/plans";
import NotFound from "./NotFound";
import { Spinner } from "@/components/ui/spinner";

function GatedContent({
  tab,
  children,
}: {
  tab: DashboardTabId;
  children: React.ReactNode;
}) {
  const { canAccessTab, loading } = usePlan();

  if (loading && !ALWAYS_ACCESSIBLE_TABS.includes(tab)) {
    return (
      <div className="flex justify-center py-24" role="status" aria-label="Loading workspace">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (ALWAYS_ACCESSIBLE_TABS.includes(tab)) return <>{children}</>;
  if (!canAccessTab(tab)) {
    const feature = TAB_REQUIRED_FEATURE[tab as keyof typeof TAB_REQUIRED_FEATURE];
    return <PlanFeatureGate feature={feature} />;
  }
  return <>{children}</>;
}

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const activeTab = getActiveTab(location);
  const { isRestricted, isActive, loading: planLoading, role } = usePlan();

  useEffect(() => {
    if (planLoading || !activeTab) return;
    if (ALWAYS_ACCESSIBLE_TABS.includes(activeTab)) return;
    const blocked = isRestricted || (!isActive && role !== "admin");
    if (blocked) {
      setLocation(getDashboardPath("billing"));
    }
  }, [isRestricted, isActive, role, activeTab, planLoading, setLocation]);

  if (activeTab === null) {
    return (
      <DashboardLayout>
        <NotFound />
      </DashboardLayout>
    );
  }

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case "search":
        return <ProductSearch />;
      case "intel":
        return <IntelligenceCenter />;
      case "trendpulse":
        return <TrendPulsePage />;
      case "adradar":
        return <AdRadarPage />;
      case "tiktokradar":
        return <TikTokRadarPage />;
      case "tiktokshop":
        return <TikTokShopPage />;
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
      case "billing":
        return <Billing />;
      case "account":
        return <AccountSettings />;
    }
  };

  return (
    <DashboardLayout>
      {activeTab === "agent" ? (
        <GatedContent tab={activeTab}>
          <AIAgent />
        </GatedContent>
      ) : (
        <GatedContent tab={activeTab}>{renderContent()}</GatedContent>
      )}
    </DashboardLayout>
  );
}
