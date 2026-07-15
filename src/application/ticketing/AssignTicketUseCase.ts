import { getTicketRepository, getAuditLogRepository } from '@/infrastructure/registries/ticketing';
import type { Ticket } from '@/domain/ticketing/entities/Ticket';

export class AssignTicketUseCase {
  async execute(ticketId: string, agentId: string | null, agentName: string): Promise<Ticket> {
    const updated = await getTicketRepository().update(ticketId, { assignedAgentId: agentId });

    await getAuditLogRepository().create({
      ticketId,
      userName: agentName,
      action: agentId ? 'Ticket atribuído' : 'Atribuição removida',
      details: agentId ? `Para ${agentName}` : undefined,
    });

    return updated;
  }
}
