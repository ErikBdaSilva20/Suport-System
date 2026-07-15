import { getSettingsRepository } from '@/infrastructure/registries/settings';
import type { AppSettings } from '@/domain/settings/entities/AppSettings';

export class UpdateSettingsUseCase {
  async execute(changes: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    return getSettingsRepository().update(changes);
  }
}
