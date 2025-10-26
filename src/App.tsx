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
import TasksPage from "./pages/Tasks";
import { PWASettings } from "./pages/PWASettings";
import AppShell from "./components/AppShell";
import { BudgetScopeProvider } from "./contexts/BudgetScopeContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Configure QueryClient with optimized settings for faster startup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1, // Reduce retries for faster startup
      refetchOnWindowFocus: false, // Prevent unnecessary refetches during startup
    },
  },
});

const App = () => {
  console.log("🎯 App component rendering at:", new Date().toISOString());

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
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
                <Route
                  path="/tasks"
                  element={
                    <AppShell>
                      <TasksPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/pwa"
                  element={
                    <AppShell>
                      <PWASettings />
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
    </ErrorBoundary>
  );
};

export default App;
