import { getTicketRepository } from '@/infrastructure/registries/ticketing';
import type { TicketFilters, TicketListResult } from '@/domain/ticketing/repositories/ITicketRepository';

export class ListTicketsUseCase {
  async execute(filters: TicketFilters): Promise<TicketListResult> {
    return getTicketRepository().list(filters);
  }
}
