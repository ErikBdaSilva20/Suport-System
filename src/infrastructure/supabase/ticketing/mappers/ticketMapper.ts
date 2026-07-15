import { Ticket } from '@/domain/ticketing/entities/Ticket';
import type { TicketProps } from '@/domain/ticketing/entities/Ticket';
import type { SLAStatus } from '@/domain/ticketing/value-objects/SLAStatus';
import type { Database } from '@/integrations/supabase/types';

type TicketRow = Database['public']['Tables']['tickets']['Row'];

export function deriveSLAStatus(row: TicketRow): SLAStatus {
  const now = new Date();
  if (row.status === 'resolved') return 'ok';

  const firstDue = row.sla_first_response_due ? new Date(row.sla_first_response_due) : null;
  const resDue = row.sla_resolution_due ? new Date(row.sla_resolution_due) : null;

  if (firstDue && !row.first_response_at && firstDue < now) return 'breached';
  if (resDue && !row.resolved_at && resDue < now) return 'breached';
  if (firstDue && !row.first_response_at && firstDue.getTime() - now.getTime() < 30 * 60_000) return 'warning';
  if (resDue && !row.resolved_at && resDue.getTime() - now.getTime() < 60 * 60_000) return 'warning';

  return (row.sla_status as SLAStatus) || 'ok';
}

export function toTicketEntity(row: TicketRow, tagIds: string[] = []): Ticket {
  const props: TicketProps = {
    id: row.id,
    number: row.number,
    subject: row.subject,
    internalTitle: (row as any).internal_title ?? null,
    description: row.description,
    status: row.status,
    priority: row.priority,
    channel: row.channel as TicketProps['channel'],
    customerId: row.customer_id,
    assignedAgentId: row.assigned_agent_id,
    tagIds,
    slaStatus: deriveSLAStatus(row),
    slaFirstResponseDue: row.sla_first_response_due ? new Date(row.sla_first_response_due) : null,
    slaResolutionDue: row.sla_resolution_due ? new Date(row.sla_resolution_due) : null,
    firstResponseAt: row.first_response_at ? new Date(row.first_response_at) : null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    closedAt: row.closed_at ? new Date(row.closed_at) : null,
    emailMessageId: row.email_message_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
  return Ticket.create(props);
}
