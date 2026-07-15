import { supabase } from '@/integrations/supabase/client';
import type { IAuditLogRepository, AuditLogEntry } from '@/domain/ticketing/repositories/IAuditLogRepository';

export class SupabaseAuditLogRepository implements IAuditLogRepository {
  async findByTicketId(ticketId: string): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(row => ({
      id: row.id,
      ticketId: row.ticket_id,
      userName: row.user_name,
      action: row.action,
      details: row.details ?? undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  async create(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const { data, error } = await supabase.from('audit_log').insert({
      ticket_id: entry.ticketId,
      user_name: entry.userName,
      action: entry.action,
      details: entry.details ?? null,
    }).select().single();

    if (error || !data) throw error ?? new Error('Failed to create audit log');
    return {
      id: data.id,
      ticketId: data.ticket_id,
      userName: data.user_name,
      action: data.action,
      details: data.details ?? undefined,
      createdAt: new Date(data.created_at),
    };
  }
}
