export interface TicketAttachmentProps {
  id: string;
  ticketMessageId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

export class TicketAttachment {
  private constructor(private readonly props: TicketAttachmentProps) {}

  static create(props: TicketAttachmentProps): TicketAttachment {
    return new TicketAttachment(props);
  }

  get id() { return this.props.id; }

  toPlainObject(): TicketAttachmentProps {
    return { ...this.props };
  }
}
