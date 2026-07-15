import { supabase } from '@/integrations/supabase/client';
import { getTicketRepository, getAuditLogRepository } from '@/infrastructure/registries/ticketing';
import { DomainError } from '@/shared/errors/DomainError';
import type { TicketStatus } from '@/domain/ticketing/value-objects/TicketStatus';
import type { Ticket } from '@/domain/ticketing/entities/Ticket';

export interface UpdateStatusResult {
  ticket: Ticket;
  zendeskSync: 'success' | 'failed' | 'skipped';
  zendeskError?: string;
}

export class UpdateTicketStatusUseCase {
  async execute(ticketId: string, newStatus: TicketStatus, agentName: string): Promise<UpdateStatusResult> {
    const ticket = await getTicketRepository().findById(ticketId);
    if (!ticket) throw new DomainError(`Ticket ${ticketId} not found`);

    if (!ticket.canTransitionTo(newStatus)) {
      throw new DomainError(`Cannot transition from ${ticket.status} to ${newStatus}`);
    }

    const changes: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'resolved') changes.resolvedAt = new Date();

    const updated = await getTicketRepository().update(ticketId, changes);

    await getAuditLogRepository().create({
      ticketId,
      userName: agentName,
      action: 'Status alterado',
      details: `De ${ticket.status} para ${newStatus}`,
    });

    // Push to Zendesk (fire-and-report; local change is preserved regardless).
    let zendeskSync: UpdateStatusResult['zendeskSync'] = 'skipped';
    let zendeskError: string | undefined;
    try {
      const { data, error } = await supabase.functions.invoke('push-zendesk-status', {
        body: { ticketId, newStatus },
      });
      if (error) {
        zendeskSync = 'failed';
        zendeskError = error.message ?? 'Falha ao contatar Zendesk';
      } else if (data?.skipped === 'no_zendesk_link') {
        zendeskSync = 'skipped';
      } else if (data?.error) {
        zendeskSync = 'failed';
        zendeskError = data.error;
      } else {
        zendeskSync = 'success';
      }
    } catch (err) {
      zendeskSync = 'failed';
      zendeskError = (err as Error).message;
    }

    return { ticket: updated, zendeskSync, zendeskError };
  }
}
