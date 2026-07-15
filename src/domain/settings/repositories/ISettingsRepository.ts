import type { AppSettings } from '../entities/AppSettings';

export interface ISettingsRepository {
  get(): Promise<AppSettings>;
  update(changes: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings>;
}
