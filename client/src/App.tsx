import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdminDashboard from "./pages/AdminDashboard";
import AdminActivityTab from "./pages/admin/AdminActivityTab";
import AdminPlansTab from "./pages/admin/AdminPlansTab";
import AdminCouponsTab from "./pages/admin/AdminCouponsTab";
import AdminSettingsTab from "./pages/admin/AdminSettingsTab";
import AdminResearchQualityTab from "./pages/admin/AdminResearchQualityTab";
import AdminRevenueTab from "./pages/admin/AdminRevenueTab";
import AdminRankingConfigTab from "./pages/admin/AdminRankingConfigTab";
import AdminLayout from "./components/AdminLayout";
import TrendsPublic from "./pages/TrendsPublic";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/trends/:slug"} component={TrendsPublic} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/dashboard/:tab?"} component={Dashboard} />
      <Route path={"/admin/activity"}>
        <AdminLayout>
          <AdminActivityTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin/research-quality"}>
        <AdminLayout>
          <AdminResearchQualityTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin/ranking-config"}>
        <AdminLayout>
          <AdminRankingConfigTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin/plans"}>
        <AdminLayout>
          <AdminPlansTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin/revenue"}>
        <AdminLayout>
          <AdminRevenueTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin/coupons"}>
        <AdminLayout>
          <AdminCouponsTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin/settings"}>
        <AdminLayout>
          <AdminSettingsTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
