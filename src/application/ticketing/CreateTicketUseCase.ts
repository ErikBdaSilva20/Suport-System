import { getTicketRepository } from '@/infrastructure/registries/ticketing';
import { supabase } from '@/integrations/supabase/client';
import type { CreateTicketProps } from '@/domain/ticketing/repositories/ITicketRepository';
import type { Ticket } from '@/domain/ticketing/entities/Ticket';

export class CreateTicketUseCase {
  async execute(props: CreateTicketProps): Promise<Ticket> {
    const ticket = getTicketRepository().create(props);
    const created = await ticket;

    // Fire-and-forget: classify priority + auto first response.
    // Errors here must NEVER block ticket creation flow.
    try {
      const id = created.toPlainObject().id;
      void supabase.functions
        .invoke('on-ticket-created-pipeline', { body: { ticketId: id } })
        .catch((e) => console.warn('[CreateTicket] pipeline failed:', e));
    } catch (e) {
      console.warn('[CreateTicket] could not invoke pipeline:', e);
    }

    return created;
  }
}
