export type MessageType = 'public_reply' | 'internal_note' | 'system';
export type SenderType = 'agent' | 'customer' | 'system';

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

export interface TicketMessageProps {
  id: string;
  ticketId: string;
  senderType: SenderType;
  senderId?: string | null;
  senderName: string;
  senderAvatar?: string | null;
  messageType: MessageType;
  body: string;
  createdAt: Date;
  attachments?: MessageAttachment[];
}

export class TicketMessage {
  private constructor(private readonly props: TicketMessageProps) {}

  static create(props: TicketMessageProps): TicketMessage {
    return new TicketMessage(props);
  }

  get id() { return this.props.id; }
  get messageType() { return this.props.messageType; }
  get senderType() { return this.props.senderType; }

  isVisibleToCustomer(): boolean {
    return this.props.messageType === 'public_reply' || this.props.messageType === 'system';
  }

  toPlainObject(): TicketMessageProps {
    return { ...this.props };
  }
}
