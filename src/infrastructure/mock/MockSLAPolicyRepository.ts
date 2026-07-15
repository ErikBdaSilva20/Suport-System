import type { ISLAPolicyRepository } from '@/domain/settings/repositories/ISLAPolicyRepository';
import type { SLAPolicy } from '@/domain/settings/entities/SLAPolicy';
import type { TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';

const defaults: SLAPolicy[] = [
  { id: 'sla-1', priority: 'urgent', firstResponseMinutes: 60, resolutionMinutes: 240 },
  { id: 'sla-2', priority: 'high', firstResponseMinutes: 120, resolutionMinutes: 480 },
  { id: 'sla-3', priority: 'medium', firstResponseMinutes: 240, resolutionMinutes: 1440 },
  { id: 'sla-4', priority: 'low', firstResponseMinutes: 480, resolutionMinutes: 2880 },
];

export class MockSLAPolicyRepository implements ISLAPolicyRepository {
  private policies: SLAPolicy[] = [...defaults];

  async list(): Promise<SLAPolicy[]> {
    return [...this.policies];
  }

  async findByPriority(priority: TicketPriority): Promise<SLAPolicy | null> {
    return this.policies.find(p => p.priority === priority) ?? null;
  }

  async upsert(policy: Omit<SLAPolicy, 'id'> & { id?: string }): Promise<SLAPolicy> {
    const existing = policy.id ? this.policies.findIndex(p => p.id === policy.id) : -1;
    const saved: SLAPolicy = { ...policy, id: policy.id ?? `sla-${Date.now()}` };
    if (existing >= 0) {
      this.policies[existing] = saved;
    } else {
      this.policies.push(saved);
    }
    return saved;
  }
}
