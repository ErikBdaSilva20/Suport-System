import type { IProfileRepository } from '@/domain/identity/repositories/IProfileRepository';
import { SupabaseProfileRepository } from '@/infrastructure/supabase/identity/SupabaseProfileRepository';
import { MockProfileRepository } from '@/infrastructure/mock/MockProfileRepository';

const useSupabase = !!import.meta.env.VITE_SUPABASE_URL;

let profileRepo: IProfileRepository | null = null;

export function getProfileRepository(): IProfileRepository {
  if (!profileRepo) profileRepo = useSupabase ? new SupabaseProfileRepository() : new MockProfileRepository();
  return profileRepo;
}

/** @internal test only */
export function _setProfileRepository(repo: IProfileRepository) { profileRepo = repo; }
