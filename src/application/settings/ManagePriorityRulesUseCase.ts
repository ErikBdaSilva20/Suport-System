import { SupabasePriorityRuleRepository } from '@/infrastructure/supabase/settings/SupabasePriorityRuleRepository';
import type { PriorityRule } from '@/domain/settings/entities/PriorityRule';

const repo = new SupabasePriorityRuleRepository();

export class ManagePriorityRulesUseCase {
  list(): Promise<PriorityRule[]> {
    return repo.list();
  }
  save(rule: Omit<PriorityRule, 'id'> & { id?: string }): Promise<PriorityRule> {
    return repo.upsert(rule);
  }
  remove(id: string): Promise<void> {
    return repo.delete(id);
  }
}
