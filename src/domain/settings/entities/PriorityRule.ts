import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

export interface PriorityRule {
  id: string;
  priority: TicketPriority;
  keywords: string[];
  intentDescription: string;
  isActive: boolean;
  sortOrder: number;
}
