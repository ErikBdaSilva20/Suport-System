import { supabase } from '@/integrations/supabase/client';
import type { ITicketParticipantRepository, TicketParticipant } from '@/domain/ticketing/repositories/ITicketParticipantRepository';

export class SupabaseTicketParticipantRepository implements ITicketParticipantRepository {
  async listByTicket(ticketId: string): Promise<TicketParticipant[]> {
    const { data, error } = await supabase
      .from('ticket_participants')
      .select('*')
      .eq('ticket_id', ticketId);
    if (error) throw error;
    return (data ?? []).map(r => ({
      ticketId: r.ticket_id,
      userId: r.user_id,
      addedAt: new Date(r.added_at),
      addedBy: r.added_by,
    }));
  }

  async add(ticketId: string, userId: string, addedBy?: string | null): Promise<void> {
    const { error } = await supabase
      .from('ticket_participants')
      .upsert({ ticket_id: ticketId, user_id: userId, added_by: addedBy ?? null }, { onConflict: 'ticket_id,user_id' });
    if (error) throw error;
  }

  async remove(ticketId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('ticket_participants')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}
