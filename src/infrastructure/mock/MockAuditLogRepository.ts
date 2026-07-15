import type { IAuditLogRepository, AuditLogEntry } from '@/domain/ticketing/repositories/IAuditLogRepository';
import { mockAuditLog } from '@/data/mockData';

function toLegacy(e: typeof mockAuditLog[number]): AuditLogEntry {
  return {
    id: e.id,
    ticketId: e.ticket_id,
    userName: e.user_name,
    action: e.action,
    details: e.details,
    createdAt: new Date(e.created_at),
  };
}

export class MockAuditLogRepository implements IAuditLogRepository {
  private entries: AuditLogEntry[];

  constructor() {
    this.entries = mockAuditLog.map(toLegacy);
  }

  async findByTicketId(ticketId: string): Promise<AuditLogEntry[]> {
    return this.entries.filter(e => e.ticketId === ticketId);
  }

  async create(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `al-${Date.now()}`,
      createdAt: new Date(),
    };
    this.entries.push(newEntry);
    return newEntry;
  }
}
