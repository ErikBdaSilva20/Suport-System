export const TICKET_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = typeof TICKET_PRIORITY[number];
export const isValidTicketPriority = (v: string): v is TicketPriority => TICKET_PRIORITY.includes(v as TicketPriority);
