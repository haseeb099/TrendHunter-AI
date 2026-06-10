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
import AdminDashboard from "./pages/AdminDashboard";
import AdminActivityTab from "./pages/admin/AdminActivityTab";
import AdminPlansTab from "./pages/admin/AdminPlansTab";
import AdminCouponsTab from "./pages/admin/AdminCouponsTab";
import AdminSettingsTab from "./pages/admin/AdminSettingsTab";
import AdminLayout from "./components/AdminLayout";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/dashboard/:tab?"} component={Dashboard} />
      <Route path={"/admin/activity"}>
        <AdminLayout>
          <AdminActivityTab />
        </AdminLayout>
      </Route>
      <Route path={"/admin/plans"}>
        <AdminLayout>
          <AdminPlansTab />
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
