import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import type { ProfileProps } from '@/domain/identity/entities/Profile';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  profile: ProfileProps | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function fetchProfile(userId: string, setProfile: React.Dispatch<React.SetStateAction<ProfileProps | null>>) {
  getProfileRepository().findById(userId)
    .then(entity => setProfile(entity?.toPlainObject() ?? null))
    .catch(() => setProfile(null));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileProps | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchProfile(newSession.user.id, setProfile);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        fetchProfile(existing.user.id, setProfile);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const refetchProfile = async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      const entity = await getProfileRepository().findById(userId);
      setProfile(entity?.toPlainObject() ?? null);
    } catch {
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
