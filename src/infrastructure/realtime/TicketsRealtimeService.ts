import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class TicketsRealtimeService {
  private channel: RealtimeChannel | null = null;

  subscribe(onUpdate: () => void): void {
    this.channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => onUpdate())
      .subscribe();
  }

  unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
