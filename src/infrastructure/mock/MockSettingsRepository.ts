import type { ISettingsRepository } from '@/domain/settings/repositories/ISettingsRepository';
import type { AppSettings } from '@/domain/settings/entities/AppSettings';

const defaultSettings: AppSettings = {
  id: 'settings-1',
  companyName: 'Help Desk SaaS',
  timezone: 'America/Sao_Paulo',
  businessHoursStart: '09:00',
  businessHoursEnd: '18:00',
  businessDays: [1, 2, 3, 4, 5],
  supportEmail: 'suporte@helpdesk.com',
  primaryColor: '#1A5276',
};

export class MockSettingsRepository implements ISettingsRepository {
  private settings: AppSettings = { ...defaultSettings };

  async get(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async update(changes: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...changes };
    return { ...this.settings };
  }
}
