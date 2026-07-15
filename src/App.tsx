import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, RequireAdmin } from "@/lib/auth";
import LoginScreen from "@/screens/LoginScreen";
import TicketsScreen from "@/screens/TicketsScreen";
import TicketDetailScreen from "@/screens/TicketDetailScreen";
import TicketNewScreen from "@/screens/TicketNewScreen";
import CustomersScreen from "@/screens/CustomersScreen";
import CustomerDetailScreen from "@/screens/CustomerDetailScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import NotFoundScreen from "@/screens/NotFoundScreen";
import AppLayout from "@/components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/" element={<Navigate to="/tickets" replace />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/tickets" element={<TicketsScreen />} />
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
