import type { ISLAPolicyRepository } from '@/domain/settings/repositories/ISLAPolicyRepository';
import type { ITagRepository } from '@/domain/settings/repositories/ITagRepository';
import type { ISettingsRepository } from '@/domain/settings/repositories/ISettingsRepository';
import { SupabaseSLAPolicyRepository } from '@/infrastructure/supabase/settings/SupabaseSLAPolicyRepository';
import { SupabaseTagRepository } from '@/infrastructure/supabase/settings/SupabaseTagRepository';
import { SupabaseSettingsRepository } from '@/infrastructure/supabase/settings/SupabaseSettingsRepository';
import { MockSLAPolicyRepository } from '@/infrastructure/mock/MockSLAPolicyRepository';
import { MockTagRepository } from '@/infrastructure/mock/MockTagRepository';
import { MockSettingsRepository } from '@/infrastructure/mock/MockSettingsRepository';

const useSupabase = !!import.meta.env.VITE_SUPABASE_URL;

let slaRepo: ISLAPolicyRepository | null = null;
let tagRepo: ITagRepository | null = null;
let settingsRepo: ISettingsRepository | null = null;

export function getSLAPolicyRepository(): ISLAPolicyRepository {
  if (!slaRepo) slaRepo = useSupabase ? new SupabaseSLAPolicyRepository() : new MockSLAPolicyRepository();
  return slaRepo;
}

export function getTagRepository(): ITagRepository {
  if (!tagRepo) tagRepo = useSupabase ? new SupabaseTagRepository() : new MockTagRepository();
  return tagRepo;
}

export function getSettingsRepository(): ISettingsRepository {
  if (!settingsRepo) settingsRepo = useSupabase ? new SupabaseSettingsRepository() : new MockSettingsRepository();
  return settingsRepo;
}
