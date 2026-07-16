import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, RequireAdmin, RequireStaff, useAuth } from "@/lib/auth";
import LoginScreen from "@/screens/LoginScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import TicketsScreen from "@/screens/TicketsScreen";
import TicketKanbanScreen from "@/screens/TicketKanbanScreen";
import TicketDetailScreen from "@/screens/TicketDetailScreen";
import TicketNewScreen from "@/screens/TicketNewScreen";
import CustomersScreen from "@/screens/CustomersScreen";
import CustomerDetailScreen from "@/screens/CustomerDetailScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import NotFoundScreen from "@/screens/NotFoundScreen";
import AppLayout from "@/components/AppLayout";

const queryClient = new QueryClient();

// Rep não tem Dashboard (Story 10.3) — pousa direto em "Meus Chamados".
function RootRedirect() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={session?.role === "rep" ? "/tickets" : "/dashboard"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/" element={<RootRedirect />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/dashboard" element={<RequireStaff><DashboardScreen /></RequireStaff>} />
              <Route path="/tickets" element={<TicketsScreen />} />
              <Route path="/tickets/kanban" element={<RequireStaff><TicketKanbanScreen /></RequireStaff>} />
              <Route path="/tickets/new" element={<TicketNewScreen />} />
              <Route path="/tickets/:id" element={<TicketDetailScreen />} />
              <Route path="/customers" element={<CustomersScreen />} />
              <Route path="/customers/:id" element={<CustomerDetailScreen />} />
              <Route path="/settings" element={<RequireAdmin><SettingsScreen /></RequireAdmin>} />
            </Route>

            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
