import type { ITicketRepository, TicketFilters, TicketListResult, CreateTicketProps } from '@/domain/ticketing/repositories/ITicketRepository';
import type { TicketProps } from '@/domain/ticketing/entities/Ticket';
import { Ticket } from '@/domain/ticketing/entities/Ticket';
import type { TicketStatus } from '@/domain/ticketing/value-objects/TicketStatus';
import { mockTickets } from '@/data/mockData';

function toLegacyTicket(t: typeof mockTickets[number]): TicketProps {
  return {
    id: t.id,
    number: t.number,
    subject: t.subject,
    description: '',
    status: t.status as TicketStatus,
    priority: t.priority,
    channel: t.channel,
    customerId: t.customer_id,
    assignedAgentId: t.assigned_agent_id ?? null,
    tagIds: t.tags,
    slaStatus: t.sla_status,
    slaFirstResponseDue: t.sla_due_at ? new Date(t.sla_due_at) : null,
    slaResolutionDue: null,
    firstResponseAt: t.first_response_at ? new Date(t.first_response_at) : null,
    resolvedAt: t.resolved_at ? new Date(t.resolved_at) : null,
    closedAt: null,
    emailMessageId: null,
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  };
}

export class MockTicketRepository implements ITicketRepository {
  private tickets: TicketProps[];

  constructor() {
    this.tickets = mockTickets.map(toLegacyTicket);
  }

  async findById(id: string): Promise<Ticket | null> {
    const t = this.tickets.find(t => t.id === id);
    return t ? Ticket.create(t) : null;
  }

  async delete(id: string): Promise<void> {
    this.tickets = this.tickets.filter(t => t.id !== id);
  }

  async list(filters: TicketFilters): Promise<TicketListResult> {
    let result = [...this.tickets];

    if (filters.status?.length) {
      result = result.filter(t => filters.status!.includes(t.status));
    }
    if (filters.priority?.length) {
      result = result.filter(t => filters.priority!.includes(t.priority));
    }
    if (filters.assignedAgentId !== undefined) {
      result = result.filter(t => t.assignedAgentId === filters.assignedAgentId);
    }
    if (filters.customerId) {
      result = result.filter(t => t.customerId === filters.customerId);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(t => t.subject.toLowerCase().includes(s));
    }

    const total = result.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    result = result.slice(start, start + pageSize);

    return { tickets: result.map(t => Ticket.create(t)), total };
  }

  async countByStatus(): Promise<Record<TicketStatus, number>> {
    const counts: Record<TicketStatus, number> = { open: 0, pending: 0, resolved: 0 };
    for (const t of this.tickets) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }

  async create(props: CreateTicketProps): Promise<Ticket> {
    const newTicket: TicketProps = {
      ...props,
      id: `tk-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tickets.push(newTicket);
    return Ticket.create(newTicket);
  }

  async update(id: string, changes: Partial<TicketProps>): Promise<Ticket> {
    const idx = this.tickets.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Ticket ${id} not found`);
    this.tickets[idx] = { ...this.tickets[idx], ...changes, updatedAt: new Date() };
    return Ticket.create(this.tickets[idx]);
  }
}
