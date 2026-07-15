import { supabase } from '@/integrations/supabase/client';
import type { ITicketRepository, TicketFilters, TicketListResult, CreateTicketProps } from '@/domain/ticketing/repositories/ITicketRepository';
import type { Ticket, TicketProps } from '@/domain/ticketing/entities/Ticket';
import { toTicketEntity } from './mappers/ticketMapper';

export class SupabaseTicketRepository implements ITicketRepository {
  async findById(id: string): Promise<Ticket | null> {
    const { data, error } = await supabase.from('tickets').select('*').eq('id', id).single();
    if (error || !data) return null;
    const { data: tagRows } = await supabase.from('ticket_tags').select('tag_id').eq('ticket_id', id);
    return toTicketEntity(data, tagRows?.map(r => r.tag_id) ?? []);
  }

  async list(filters: TicketFilters): Promise<TicketListResult> {
    let query = supabase.from('tickets').select('*', { count: 'exact' });
    if (filters.status?.length) query = query.in('status', filters.status);
    if (filters.priority?.length) query = query.in('priority', filters.priority);
    if (filters.assignedAgentId !== undefined) {
      if (filters.assignedAgentId === null) query = query.is('assigned_agent_id', null);
      else query = query.eq('assigned_agent_id', filters.assignedAgentId);
    }
    if (filters.involvedUserId) {
      const { data: partRows } = await supabase
        .from('ticket_participants')
        .select('ticket_id')
        .eq('user_id', filters.involvedUserId);
      const participantIds = (partRows ?? []).map(r => r.ticket_id);
      if (participantIds.length > 0) {
        query = query.or(`assigned_agent_id.eq.${filters.involvedUserId},id.in.(${participantIds.join(',')})`);
      } else {
        query = query.eq('assigned_agent_id', filters.involvedUserId);
      }
    }
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.search) query = query.or(`subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    query = query.order('created_at', { ascending: false }).range(from, from + pageSize - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const tickets = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: tagRows } = await supabase.from('ticket_tags').select('tag_id').eq('ticket_id', row.id);
        return toTicketEntity(row, tagRows?.map(r => r.tag_id) ?? []);
      })
    );
    return { tickets, total: count ?? 0 };
  }

  async countByStatus(): Promise<Record<string, number>> {
    const { data, error } = await supabase.from('tickets').select('status');
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return counts;
  }

  async create(props: CreateTicketProps): Promise<Ticket> {
    const { data, error } = await supabase.from('tickets').insert({
      subject: props.subject, description: props.description,
      status: props.status, priority: props.priority,
      channel: props.channel, customer_id: props.customerId,
      assigned_agent_id: props.assignedAgentId ?? null,
      sla_status: props.slaStatus ?? 'ok',
    }).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    if (props.tagIds?.length) {
      await supabase.from('ticket_tags').insert(props.tagIds.map(tagId => ({ ticket_id: data.id, tag_id: tagId })));
    }
    return toTicketEntity(data, props.tagIds ?? []);
  }

  async update(id: string, changes: Partial<TicketProps>): Promise<Ticket> {
    const { data, error } = await supabase.from('tickets').update({
      ...(changes.status !== undefined && { status: changes.status }),
      ...(changes.priority !== undefined && { priority: changes.priority }),
      ...(changes.assignedAgentId !== undefined && { assigned_agent_id: changes.assignedAgentId }),
      ...(changes.subject !== undefined && { subject: changes.subject }),
      ...(changes.internalTitle !== undefined && { internal_title: changes.internalTitle } as any),
      ...(changes.description !== undefined && { description: changes.description }),
      ...(changes.firstResponseAt !== undefined && { first_response_at: changes.firstResponseAt?.toISOString() ?? null }),
    }).eq('id', id).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    const { data: tagRows } = await supabase.from('ticket_tags').select('tag_id').eq('ticket_id', id);
    return toTicketEntity(data, tagRows?.map(r => r.tag_id) ?? []);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) throw error;
  }
}
