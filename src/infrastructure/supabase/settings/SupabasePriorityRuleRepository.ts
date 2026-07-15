import { supabase } from '@/integrations/supabase/client';
import type { IPriorityRuleRepository } from '@/domain/settings/repositories/IPriorityRuleRepository';
import type { PriorityRule } from '@/domain/settings/entities/PriorityRule';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

interface Row {
  id: string;
  priority: TicketPriority;
  keywords: string[] | null;
  intent_description: string | null;
  is_active: boolean;
  sort_order: number;
}

function fromRow(r: Row): PriorityRule {
  return {
    id: r.id,
    priority: r.priority,
    keywords: r.keywords ?? [],
    intentDescription: r.intent_description ?? '',
    isActive: r.is_active,
    sortOrder: r.sort_order,
  };
}

export class SupabasePriorityRuleRepository implements IPriorityRuleRepository {
  async list(): Promise<PriorityRule[]> {
    const { data, error } = await supabase
      .from('priority_rules')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => fromRow(r as Row));
  }

  async upsert(rule: Omit<PriorityRule, 'id'> & { id?: string }): Promise<PriorityRule> {
    const payload = {
      priority: rule.priority,
      keywords: rule.keywords,
      intent_description: rule.intentDescription,
      is_active: rule.isActive,
      sort_order: rule.sortOrder,
    };
    if (rule.id) {
      const { data, error } = await supabase
        .from('priority_rules').update(payload).eq('id', rule.id).select().single();
      if (error || !data) throw error ?? new Error('Failed');
      return fromRow(data as Row);
    }
    const { data, error } = await supabase
      .from('priority_rules').insert(payload).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return fromRow(data as Row);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('priority_rules').delete().eq('id', id);
    if (error) throw error;
  }
}
