export interface TicketParticipant {
  ticketId: string;
  userId: string;
  addedAt: Date;
  addedBy?: string | null;
}

export interface ITicketParticipantRepository {
  listByTicket(ticketId: string): Promise<TicketParticipant[]>;
  add(ticketId: string, userId: string, addedBy?: string | null): Promise<void>;
  remove(ticketId: string, userId: string): Promise<void>;
}
