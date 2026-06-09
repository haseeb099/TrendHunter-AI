import DashboardLayout from "@/components/DashboardLayout";
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
import { useLocation } from "wouter";
import { getActiveTab } from "@/config/dashboardNav";
import NotFound from "./NotFound";

export default function Dashboard() {
  const [location] = useLocation();
  const activeTab = getActiveTab(location);

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
    }
  };

  return <DashboardLayout>{renderContent()}</DashboardLayout>;
}
