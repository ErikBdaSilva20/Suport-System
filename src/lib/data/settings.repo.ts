import { db } from './client';

export interface AppSettings {
  id: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

export const listSettings = () => db.table<AppSettings>('settings').list();

export const createSettings = (input: { company_name: string }) =>
  db.table<AppSettings>('settings').create(input);

export const updateSettings = (
  id: string,
  patch: Partial<Pick<AppSettings, 'company_name'>>
) => db.table<AppSettings>('settings').update(id, patch);
