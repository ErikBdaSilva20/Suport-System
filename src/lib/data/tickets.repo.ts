import { db } from './client';
import type { Database, TicketPriority, TicketStatus } from './types.gen';

export type Ticket = Database['public']['Tables']['tickets']['Row'];

export const listTickets = () => db.table<Ticket>('tickets').list();

export const createTicket = (input: {
  customer_id: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
}) => db.table<Ticket>('tickets').create(input);

export const updateTicket = (id: string, patch: Partial<Pick<Ticket, 'subject' | 'description' | 'status' | 'priority' | 'assigned_to' | 'resolved_at'>>) =>
  db.table<Ticket>('tickets').update(id, patch);

export const deleteTicket = (id: string) => db.table<Ticket>('tickets').remove(id);

export const assignTicket = (id: string, assignedTo: string) =>
  updateTicket(id, { status: 'in_progress' as TicketStatus, assigned_to: assignedTo });

export const resolveTicket = (id: string) =>
  updateTicket(id, { status: 'resolved' as TicketStatus, resolved_at: new Date().toISOString() });
