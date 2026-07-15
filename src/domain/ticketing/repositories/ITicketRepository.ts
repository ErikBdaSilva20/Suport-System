import type { Ticket, TicketProps } from '../entities/Ticket';
import type { TicketStatus } from '../value-objects/TicketStatus';
import type { TicketPriority } from '../value-objects/TicketPriority';

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assignedAgentId?: string | null;
  involvedUserId?: string;
  customerId?: string;
  tagIds?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TicketListResult {
  tickets: Ticket[];
  total: number;
}

export type CreateTicketProps = Omit<TicketProps, 'id' | 'createdAt' | 'updatedAt'>;

export interface ITicketReader {
  findById(id: string): Promise<Ticket | null>;
  list(filters: TicketFilters): Promise<TicketListResult>;
  countByStatus(): Promise<Record<TicketStatus, number>>;
}

export interface ITicketWriter {
  create(props: CreateTicketProps): Promise<Ticket>;
  update(id: string, changes: Partial<TicketProps>): Promise<Ticket>;
  delete(id: string): Promise<void>;
}

export interface ITicketRepository extends ITicketReader, ITicketWriter {}
