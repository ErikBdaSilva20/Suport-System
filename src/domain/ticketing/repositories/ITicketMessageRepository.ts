import type { TicketMessage, TicketMessageProps } from '../entities/TicketMessage';

export type CreateMessageProps = Omit<TicketMessageProps, 'id' | 'createdAt'>;

export interface ITicketMessageRepository {
  findByTicketId(ticketId: string): Promise<TicketMessage[]>;
  create(props: CreateMessageProps): Promise<TicketMessage>;
}
