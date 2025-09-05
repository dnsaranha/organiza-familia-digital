import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import GroupsPage from "./pages/Groups";
import ReportsPage from "./pages/Reports";
import InvestmentsPage from "./pages/Investments";
import NotificationSettingsPage from "./pages/NotificationSettings";
import OpenFinanceConnectPage from "./pages/OpenFinanceConnect";
import AppShell from "./components/AppShell";
import { BudgetScopeProvider } from "./contexts/BudgetScopeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BudgetScopeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/success" element={<Success />} />

            <Route
              path="/"
              element={
                <AppShell>
                  <Index />
                </AppShell>
              }
            />
            <Route
              path="/profile"
              element={
                <AppShell>
                  <Profile />
                </AppShell>
              }
            />
            <Route
              path="/groups"
              element={
                <AppShell>
                  <GroupsPage />
                </AppShell>
              }
            />
            <Route
              path="/reports"
              element={
                <AppShell>
                  <ReportsPage />
                </AppShell>
              }
            />
            <Route
              path="/investments"
              element={
                <AppShell>
                  <InvestmentsPage />
                </AppShell>
              }
            />
            <Route
              path="/settings/notifications"
              element={
                <AppShell>
                  <NotificationSettingsPage />
                </AppShell>
              }
            />
            <Route
              path="/connect"
              element={
                <AppShell>
                  <OpenFinanceConnectPage />
                </AppShell>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BudgetScopeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
