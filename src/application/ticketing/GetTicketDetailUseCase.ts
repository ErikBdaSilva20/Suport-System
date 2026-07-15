import { getTicketRepository, getTicketMessageRepository, getAuditLogRepository } from '@/infrastructure/registries/ticketing';
import { getCustomerRepository } from '@/infrastructure/registries/customer-portal';
import type { Ticket } from '@/domain/ticketing/entities/Ticket';
import type { TicketMessage } from '@/domain/ticketing/entities/TicketMessage';
import type { AuditLogEntry } from '@/domain/ticketing/repositories/IAuditLogRepository';
import type { Customer } from '@/domain/customer-portal/entities/Customer';

export interface TicketDetailResult {
  ticket: Ticket;
  messages: TicketMessage[];
  auditLog: AuditLogEntry[];
  customer: Customer | null;
}

export class GetTicketDetailUseCase {
  async execute(ticketId: string): Promise<TicketDetailResult | null> {
    const ticket = await getTicketRepository().findById(ticketId);
    if (!ticket) return null;

    const [messages, auditLog, customer] = await Promise.all([
      getTicketMessageRepository().findByTicketId(ticketId),
      getAuditLogRepository().findByTicketId(ticketId),
      getCustomerRepository().findById(ticket.toPlainObject().customerId),
    ]);

    return { ticket, messages, auditLog, customer };
  }
}
