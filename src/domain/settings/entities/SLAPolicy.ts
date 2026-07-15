import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

export interface SLAPolicy {
  id: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}
