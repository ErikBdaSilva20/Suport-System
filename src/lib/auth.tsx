import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, type AuthSession } from '@/lib/data/client';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = async () => {
    const s = await auth.me();
    setSession(s);
  };

  useEffect(() => {
    refetch().finally(() => setIsLoading(false));
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function AuthSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();

  if (isLoading) return <AuthSpinner />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();

  if (isLoading) return <AuthSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== 'admin') return <Navigate to="/tickets" replace />;

  return <>{children}</>;
}

// Telas de gestão de equipe (dashboard, kanban) não fazem sentido pra um rep —
// ele tem a própria home enxuta em /tickets (Story 10.3). Bloqueia acesso
// direto por URL, não só a ausência do link no menu (Story 10.1).
export function RequireStaff({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();

  if (isLoading) return <AuthSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'rep') return <Navigate to="/tickets" replace />;

  return <>{children}</>;
}
