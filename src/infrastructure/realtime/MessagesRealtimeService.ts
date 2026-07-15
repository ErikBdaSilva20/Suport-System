import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class MessagesRealtimeService {
  private channel: RealtimeChannel | null = null;

  subscribe(ticketId: string, onUpdate: () => void): void {
    this.channel = supabase
      .channel(`messages:ticket_${ticketId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, () => onUpdate())
      .subscribe();
  }

  unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
