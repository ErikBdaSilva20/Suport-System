export interface AuditLogEntry {
  id: string;
  ticketId: string;
  userName: string;
  action: string;
  details?: string;
  createdAt: Date;
}

export interface IAddAuditLog {
  create(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry>;
  findByTicketId(ticketId: string): Promise<AuditLogEntry[]>;
}

export type IAuditLogRepository = IAddAuditLog;
