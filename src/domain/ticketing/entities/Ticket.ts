import type { TicketStatus } from '../value-objects/TicketStatus';
import type { TicketPriority } from '../value-objects/TicketPriority';
import type { SLAStatus } from '../value-objects/SLAStatus';

export interface TicketProps {
  id: string;
  number: number;
  subject: string;
  internalTitle?: string | null;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: 'email' | 'chat' | 'phone' | 'api';
  customerId: string;
  assignedAgentId?: string | null;
  tagIds: string[];
  slaStatus: SLAStatus;
  slaFirstResponseDue?: Date | null;
  slaResolutionDue?: Date | null;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  emailMessageId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Ticket {
  private constructor(private readonly props: TicketProps) {}

  static create(props: TicketProps): Ticket {
    return new Ticket(props);
  }

  get id() { return this.props.id; }
  get status() { return this.props.status; }
  get priority() { return this.props.priority; }
  get slaStatus() { return this.props.slaStatus; }
  get assignedAgentId() { return this.props.assignedAgentId; }

  canTransitionTo(newStatus: TicketStatus): boolean {
    const allowed: Record<TicketStatus, TicketStatus[]> = {
      open: ['pending', 'resolved'],
      pending: ['open', 'resolved'],
      resolved: ['open'],
    };
    return allowed[this.props.status]?.includes(newStatus) ?? false;
  }

  isAtRisk(): boolean {
    return this.props.slaStatus === 'warning' || this.props.slaStatus === 'breached';
  }

  toPlainObject(): TicketProps {
    return { ...this.props };
  }
}
