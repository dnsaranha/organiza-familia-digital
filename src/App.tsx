import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";
import Reports from "./pages/Reports";
import Groups from "./pages/Groups";
import Settings from "./pages/Settings";
import { BudgetScopeProvider } from "./contexts/BudgetScopeContext";
import MainLayout from "./layouts/MainLayout";

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

            {/* Routes with the main layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BudgetScopeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
