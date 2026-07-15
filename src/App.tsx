import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeProvider } from "@/presentation/context/RealtimeContext";
import { ProtectedRoute } from "@/presentation/components/ProtectedRoute";
import { AdminRoute } from "@/presentation/components/AdminRoute";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TicketList from "./pages/TicketList";
import TicketDetail from "./pages/TicketDetail";
import TicketNew from "./pages/TicketNew";
import KBList from "./pages/KBList";
import KBEditor from "./pages/KBEditor";
import KBAssistant from "./pages/KBAssistant";
import SetupWizard from "./pages/SetupWizard";
import SettingsLayout from "./pages/settings/SettingsLayout";
import GeneralSettings from "./pages/settings/GeneralSettings";
import SLASettings from "./pages/settings/SLASettings";
import TagsSettings from "./pages/settings/TagsSettings";
import TeamSettings from "./pages/settings/TeamSettings";
import IntegrationsSettings from "./pages/settings/IntegrationsSettings";
import AutomationSettings from "./pages/settings/AutomationSettings";
import CustomerList from "./pages/CustomerList";
import CustomerDetail from "./pages/CustomerDetail";
import Profile from "./pages/Profile";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import CSATPage from "./pages/CSATPage";
import ClientChat from "./pages/ClientChat";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RealtimeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/csat/:token" element={<CSATPage />} />
            <Route path="/c/:token" element={<ClientChat />} />
            <Route path="/setup" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tickets" element={<TicketList />} />
              <Route path="/tickets/new" element={<TicketNew />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/kb" element={<KBList />} />
              <Route path="/kb/assistant" element={<KBAssistant />} />
              <Route path="/kb/new" element={<KBEditor />} />
              <Route path="/kb/:id/edit" element={<KBEditor />} />
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/settings/general" replace />} />
                <Route path="general" element={<GeneralSettings />} />
                <Route path="sla" element={<SLASettings />} />
                <Route path="tags" element={<TagsSettings />} />
                <Route path="team" element={<AdminRoute><TeamSettings /></AdminRoute>} />
                <Route path="integrations" element={<AdminRoute><IntegrationsSettings /></AdminRoute>} />
                <Route path="automation" element={<AdminRoute><AutomationSettings /></AdminRoute>} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </RealtimeProvider>
  </QueryClientProvider>
);

export default App;
