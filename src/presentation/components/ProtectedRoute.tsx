import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/presentation/context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
