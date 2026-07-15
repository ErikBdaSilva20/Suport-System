import { db } from './client';
import type { Database } from './types.gen';

export type TicketNote = Database['public']['Tables']['ticket_notes']['Row'];

export const listTicketNotes = () => db.table<TicketNote>('ticket_notes').list();

export const createTicketNote = (input: { ticket_id: string; body: string }) =>
  db.table<TicketNote>('ticket_notes').create(input);

export const deleteTicketNote = (id: string) => db.table<TicketNote>('ticket_notes').remove(id);
