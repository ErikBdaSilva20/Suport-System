import { getSLAPolicyRepository } from '@/infrastructure/registries/settings';
import type { SLAPolicy } from '@/domain/settings/entities/SLAPolicy';

export class SaveSLAPolicyUseCase {
  async execute(policy: Omit<SLAPolicy, 'id'> & { id?: string }): Promise<SLAPolicy> {
    return getSLAPolicyRepository().upsert(policy);
  }
}
