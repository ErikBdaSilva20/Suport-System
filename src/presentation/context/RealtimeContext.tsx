import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { TicketsRealtimeService } from '@/infrastructure/realtime/TicketsRealtimeService';
import { MessagesRealtimeService } from '@/infrastructure/realtime/MessagesRealtimeService';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceEntry {
  agentId: string;
  online_at: string;
}

interface RealtimeContextValue {
  subscribeToTicket: (ticketId: string, callback: () => void) => () => void;
  onlineAgents: Record<string, PresenceEntry[]>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuthContext();
  const queryClient = useQueryClient();
  const ticketsService = useRef<TicketsRealtimeService | null>(null);
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  const [onlineAgents, setOnlineAgents] = useState<Record<string, PresenceEntry[]>>({});

  // Global tickets subscription
  useEffect(() => {
    if (!session) return;
    const svc = new TicketsRealtimeService();
    svc.subscribe(() => queryClient.invalidateQueries({ queryKey: ['tickets'] }));
    ticketsService.current = svc;
    return () => { svc.unsubscribe(); ticketsService.current = null; };
  }, [session, queryClient]);

  // Presence channel for agents
  useEffect(() => {
    if (!session || !profile) return;
    const channel = supabase.channel('online_agents', { config: { presence: { key: profile.id } } });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineAgents(channel.presenceState() as Record<string, PresenceEntry[]>);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ agentId: profile.id, online_at: new Date().toISOString() });
        }
      });

    presenceChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
      presenceChannel.current = null;
    };
  }, [session, profile]);

  const subscribeToTicket = useCallback((ticketId: string, callback: () => void) => {
    const svc = new MessagesRealtimeService();
    svc.subscribe(ticketId, callback);
    return () => svc.unsubscribe();
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribeToTicket, onlineAgents }}>
      {children}
    </RealtimeContext.Provider>
  );
}
