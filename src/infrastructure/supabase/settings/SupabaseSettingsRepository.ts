import { supabase } from '@/integrations/supabase/client';
import type { ISettingsRepository } from '@/domain/settings/repositories/ISettingsRepository';
import type { AppSettings } from '@/domain/settings/entities/AppSettings';
import type { Database } from '@/integrations/supabase/types';

type SettingsRow = Database['public']['Tables']['settings']['Row'];

function toSettings(data: SettingsRow): AppSettings {
  return {
    id: data.id, companyName: data.company_name, companyLogoUrl: data.company_logo_url,
    timezone: data.timezone, businessHoursStart: data.business_hours_start,
    businessHoursEnd: data.business_hours_end, businessDays: data.business_days ?? [1,2,3,4,5],
    supportEmail: data.support_email,
    appBaseUrl: (data as any).app_base_url ?? null,
    primaryColor: data.primary_color,
    resendFromEmail: (data as any).resend_from_email ?? null,
  };
}

export class SupabaseSettingsRepository implements ISettingsRepository {
  async get(): Promise<AppSettings> {
    const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
    if (data) return toSettings(data);
    // Auto-seed a default row if none exists (e.g. after a fresh remix)
    const { data: created, error: insertErr } = await supabase
      .from('settings')
      .insert({} as any)
      .select()
      .single();
    if (insertErr || !created) throw insertErr ?? new Error('Settings not found');
    return toSettings(created);
  }

  async update(changes: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    const { data: existing } = await supabase.from('settings').select('id').limit(1).single();
    if (!existing) throw new Error('Settings not found');

    const { data, error } = await supabase.from('settings').update({
      ...(changes.companyName !== undefined && { company_name: changes.companyName }),
      ...(changes.companyLogoUrl !== undefined && { company_logo_url: changes.companyLogoUrl }),
      ...(changes.timezone !== undefined && { timezone: changes.timezone }),
      ...(changes.businessHoursStart !== undefined && { business_hours_start: changes.businessHoursStart }),
      ...(changes.businessHoursEnd !== undefined && { business_hours_end: changes.businessHoursEnd }),
      ...(changes.businessDays !== undefined && { business_days: changes.businessDays }),
      ...(changes.supportEmail !== undefined && { support_email: changes.supportEmail }),
      ...(changes.primaryColor !== undefined && { primary_color: changes.primaryColor }),
      ...(changes.appBaseUrl !== undefined && { app_base_url: changes.appBaseUrl } as any),
    } as any).eq('id', existing.id).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return toSettings(data);
  }
}
