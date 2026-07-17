// Precisa ser o 1º import do arquivo (fora de ordem alfabética de propósito):
// ativa window.__MASI_PREVIEW__ antes de qualquer import abaixo puxar
// '@/lib/auth' → client.ts, que decide o modo preview na avaliação do módulo.
// Fora do modo demo (VITE_MOCK_MODE ausente) é um no-op — ver src/mock/bootstrap.ts.
import { isMockMode } from '@/mock/bootstrap';
import { MockRoleSwitcher } from '@/mock/MockRoleSwitcher';

import AppLayout from '@/components/AppLayout';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, RequireAdmin, RequireAuth, RequireStaff, useAuth } from '@/lib/auth';
import CustomerDetailScreen from '@/screens/CustomerDetailScreen';
import CustomersScreen from '@/screens/CustomersScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import FeedbackScreen from '@/screens/FeedbackScreen';
import LoginScreen from '@/screens/LoginScreen';
import NotFoundScreen from '@/screens/NotFoundScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import TicketDetailScreen from '@/screens/TicketDetailScreen';
import TicketKanbanScreen from '@/screens/TicketKanbanScreen';
import TicketNewScreen from '@/screens/TicketNewScreen';
import TicketsScreen from '@/screens/TicketsScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

const queryClient = new QueryClient();

function RootRedirect() {
  const { session, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={session?.role === 'rep' ? '/tickets' : '/dashboard'} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {isMockMode && <MockRoleSwitcher />}
        <BrowserRouter>
          <Routes>
            {/* Modo demo: sem gateway real pra autenticar de verdade, então /login
                nem deveria existir de fato — qualquer acesso direto (link, back
                do navegador) volta pra "/", que já entra logado como o papel
                escolhido no MockRoleSwitcher. */}
            <Route
              path="/login"
              element={isMockMode ? <Navigate to="/" replace /> : <LoginScreen />}
            />
            <Route path="/" element={<RootRedirect />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route
                path="/dashboard"
                element={
                  <RequireStaff>
                    <DashboardScreen />
                  </RequireStaff>
                }
              />
              <Route path="/tickets" element={<TicketsScreen />} />
              <Route
                path="/tickets/kanban"
                element={
                  <RequireStaff>
                    <TicketKanbanScreen />
                  </RequireStaff>
                }
              />
              <Route path="/tickets/new" element={<TicketNewScreen />} />
              <Route path="/tickets/:id" element={<TicketDetailScreen />} />
              <Route path="/customers" element={<CustomersScreen />} />
              <Route path="/customers/:id" element={<CustomerDetailScreen />} />
              <Route path="/feedback" element={<FeedbackScreen />} />
              <Route
                path="/settings"
                element={
                  <RequireAdmin>
                    <SettingsScreen />
                  </RequireAdmin>
                }
              />
            </Route>

            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
