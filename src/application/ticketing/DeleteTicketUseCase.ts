import { getTicketRepository } from '@/infrastructure/registries/ticketing';

/**
 * Deleta o ticket apenas do banco local. Não afeta o Zendesk — o ticket
 * permanece lá e pode ser reimportado via "Atualizar Tickets".
 */
export class DeleteTicketUseCase {
  async execute(ticketId: string): Promise<void> {
    await getTicketRepository().delete(ticketId);
  }
}
