import { useQuery } from '@tanstack/react-query';
import { ListTicketsUseCase } from '@/application/ticketing/ListTicketsUseCase';
import type { TicketFilters } from '@/domain/ticketing/repositories/ITicketRepository';
import type { Ticket as LegacyTicket, Customer, Profile } from '@/types';
import { getCustomerRepository } from '@/infrastructure/registries/customer-portal';
import { getProfileRepository } from '@/infrastructure/registries/identity';

function toSnakeCase(
  ticket: ReturnType<import('@/domain/ticketing/entities/Ticket').Ticket['toPlainObject']>,
  customer?: Customer,
  agent?: Profile,
  involvement?: 'assignee' | 'participant' | 'both',
): LegacyTicket {
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    internal_title: ticket.internalTitle ?? null,
    status: ticket.status,
    priority: ticket.priority,
    channel: ticket.channel,
    customer_id: ticket.customerId,
    customer,
    assigned_agent_id: ticket.assignedAgentId ?? undefined,
    assigned_agent: agent,
    tags: ticket.tagIds,
    sla_status: ticket.slaStatus,
    sla_due_at: ticket.slaFirstResponseDue?.toISOString(),
    created_at: ticket.createdAt.toISOString(),
    updated_at: ticket.updatedAt.toISOString(),
    resolved_at: ticket.resolvedAt?.toISOString(),
    first_response_at: ticket.firstResponseAt?.toISOString(),
    involvement,
  };
}

async function fetchTickets(filters: TicketFilters) {
  const uc = new ListTicketsUseCase();
  const result = await uc.execute(filters);

  const customerRepo = getCustomerRepository();
  const profileRepo = getProfileRepository();

  // Collect unique IDs
  const customerIds = new Set<string>();
  const agentIds = new Set<string>();
  result.tickets.forEach(t => {
    const p = t.toPlainObject();
    customerIds.add(p.customerId);
    if (p.assignedAgentId) agentIds.add(p.assignedAgentId);
  });

  // Lookup participant ticket IDs for involvement tagging
  let participantTicketIds = new Set<string>();
  if (filters.involvedUserId) {
    const { supabase } = await import('@/integrations/supabase/client');
    const ticketIds = result.tickets.map(t => t.toPlainObject().id);
    if (ticketIds.length > 0) {
      const { data } = await supabase
        .from('ticket_participants')
        .select('ticket_id')
        .eq('user_id', filters.involvedUserId)
        .in('ticket_id', ticketIds);
      participantTicketIds = new Set((data ?? []).map(r => r.ticket_id));
    }
  }

  // Fetch in parallel
  const [customers, agents] = await Promise.all([
    Promise.all([...customerIds].map(id => customerRepo.findById(id))),
    Promise.all([...agentIds].map(id => profileRepo.findById(id))),
  ]);

  const customerMap = new Map<string, Customer>();
  customers.forEach(c => {
    if (!c) return;
    const p = c.toPlainObject();
    customerMap.set(p.id, { id: p.id, name: p.fullName, email: p.email, phone: p.phone ?? undefined, company: p.company ?? undefined, created_at: p.createdAt.toISOString() });
  });

  const agentMap = new Map<string, Profile>();
  agents.forEach(a => {
    if (!a) return;
    const p = a.toPlainObject();
    agentMap.set(p.id, { id: p.id, full_name: p.fullName, email: p.email, role: p.role, avatar_url: p.avatarUrl ?? undefined, is_active: p.isActive });
  });

  return {
    tickets: result.tickets.map(t => {
      const p = t.toPlainObject();
      let involvement: 'assignee' | 'participant' | 'both' | undefined;
      if (filters.involvedUserId) {
        const isAssignee = p.assignedAgentId === filters.involvedUserId;
        const isParticipant = participantTicketIds.has(p.id);
        if (isAssignee && isParticipant) involvement = 'both';
        else if (isAssignee) involvement = 'assignee';
        else if (isParticipant) involvement = 'participant';
      }
      return toSnakeCase(p, customerMap.get(p.customerId), p.assignedAgentId ? agentMap.get(p.assignedAgentId) : undefined, involvement);
    }),
    total: result.total,
  };
}

export function useTickets(filters: TicketFilters = {}, enabled = true) {
  const queryResult = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => fetchTickets(filters),
    enabled,
    staleTime: 30_000,
  });

  return {
    data: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
