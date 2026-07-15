import type { ITicketMessageRepository, CreateMessageProps } from '@/domain/ticketing/repositories/ITicketMessageRepository';
import { TicketMessage, type TicketMessageProps } from '@/domain/ticketing/entities/TicketMessage';
import { mockMessages } from '@/data/mockData';

function toLegacy(m: typeof mockMessages[number]): TicketMessageProps {
  return {
    id: m.id,
    ticketId: m.ticket_id,
    senderType: m.sender_type,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderAvatar: m.sender_avatar ?? null,
    messageType: m.message_type,
    body: m.body,
    createdAt: new Date(m.created_at),
  };
}

export class MockTicketMessageRepository implements ITicketMessageRepository {
  private messages: TicketMessageProps[];

  constructor() {
    this.messages = mockMessages.map(toLegacy);
  }

  async findByTicketId(ticketId: string): Promise<TicketMessage[]> {
    return this.messages
      .filter(m => m.ticketId === ticketId)
      .map(m => TicketMessage.create(m));
  }

  async create(props: CreateMessageProps): Promise<TicketMessage> {
    const msg: TicketMessageProps = {
      ...props,
      id: `msg-${Date.now()}`,
      createdAt: new Date(),
    };
    this.messages.push(msg);
    return TicketMessage.create(msg);
  }
}
