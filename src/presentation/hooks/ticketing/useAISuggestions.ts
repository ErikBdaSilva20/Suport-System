import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TicketPriority, TicketStatus } from '@/types';

export interface AISuggestion {
  id: string;
  ticket_id: string;
  kind: string;
  suggested_priority: TicketPriority | null;
  suggested_status: TicketStatus | null;
  reasoning: string;
  confidence: number;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
}

export function useAISuggestions(ticketId: string | undefined) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    const { data } = await supabase
      .from('ticket_ai_suggestions')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setSuggestions((data ?? []) as AISuggestion[]);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ai-suggestions-${ticketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_ai_suggestions', filter: `ticket_id=eq.${ticketId}` },
        () => { refetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, refetch]);

  const resolve = useCallback(async (id: string, action: 'applied' | 'dismissed') => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('ticket_ai_suggestions')
      .update({
        status: action,
        resolved_by: user?.id ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    refetch();
  }, [refetch]);

  return { suggestions, loading, resolve, refetch };
}
