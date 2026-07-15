import type { PriorityRule } from '../entities/PriorityRule';

export interface IPriorityRuleRepository {
  list(): Promise<PriorityRule[]>;
  upsert(rule: Omit<PriorityRule, 'id'> & { id?: string }): Promise<PriorityRule>;
  delete(id: string): Promise<void>;
}
