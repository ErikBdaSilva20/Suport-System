import { useAuthContext } from '@/presentation/context/AuthContext';
import type { Profile as LegacyProfile } from '@/types';

export function useAuth() {
  const { session, profile, isLoading, signOut } = useAuthContext();

  // Convert domain ProfileProps to legacy Profile format for backward compatibility
  const currentUser: LegacyProfile | null = profile ? {
    id: profile.id,
    full_name: profile.fullName,
    email: profile.email,
    role: profile.role,
    avatar_url: profile.avatarUrl ?? undefined,
    is_active: profile.isActive,
  } : null;

  return {
    currentUser,
    isAuthenticated: !!session,
    isLoading,
    session,
    profile,
    signOut,
  };
}
