import type { SLAPolicy } from '../entities/SLAPolicy';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

export interface ISLAPolicyRepository {
  list(): Promise<SLAPolicy[]>;
  findByPriority(priority: TicketPriority): Promise<SLAPolicy | null>;
  upsert(policy: Omit<SLAPolicy, 'id'> & { id?: string }): Promise<SLAPolicy>;
}
