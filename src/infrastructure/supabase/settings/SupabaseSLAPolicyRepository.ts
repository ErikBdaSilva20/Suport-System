import { supabase } from '@/integrations/supabase/client';
import type { ISLAPolicyRepository } from '@/domain/settings/repositories/ISLAPolicyRepository';
import type { SLAPolicy } from '@/domain/settings/entities/SLAPolicy';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

export class SupabaseSLAPolicyRepository implements ISLAPolicyRepository {
  async list(): Promise<SLAPolicy[]> {
    const { data } = await supabase.from('sla_policies').select('*');
    return (data ?? []).map(r => ({
      id: r.id, priority: r.priority as TicketPriority,
      firstResponseMinutes: r.first_response_minutes, resolutionMinutes: r.resolution_minutes,
    }));
  }

  async findByPriority(priority: TicketPriority): Promise<SLAPolicy | null> {
    const { data } = await supabase.from('sla_policies').select('*').eq('priority', priority).single();
    if (!data) return null;
    return { id: data.id, priority: data.priority as TicketPriority, firstResponseMinutes: data.first_response_minutes, resolutionMinutes: data.resolution_minutes };
  }

  async upsert(policy: Omit<SLAPolicy, 'id'> & { id?: string }): Promise<SLAPolicy> {
    const { data, error } = await supabase.from('sla_policies').upsert({
      ...(policy.id ? { id: policy.id } : {}),
      priority: policy.priority,
      first_response_minutes: policy.firstResponseMinutes,
      resolution_minutes: policy.resolutionMinutes,
    }, { onConflict: 'priority' }).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return { id: data.id, priority: data.priority as TicketPriority, firstResponseMinutes: data.first_response_minutes, resolutionMinutes: data.resolution_minutes };
  }
}
