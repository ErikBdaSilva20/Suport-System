export const TICKET_STATUS = ['open', 'pending', 'resolved'] as const;
export type TicketStatus = typeof TICKET_STATUS[number];
export const isValidTicketStatus = (v: string): v is TicketStatus => TICKET_STATUS.includes(v as TicketStatus);
