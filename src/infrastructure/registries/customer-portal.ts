import type { ICustomerRepository } from '@/domain/customer-portal/repositories/ICustomerRepository';
import type { ICSATRepository } from '@/domain/customer-portal/repositories/ICSATRepository';
import { SupabaseCustomerRepository } from '@/infrastructure/supabase/customer-portal/SupabaseCustomerRepository';
import { SupabaseCSATRepository } from '@/infrastructure/supabase/customer-portal/SupabaseCSATRepository';
import { MockCustomerRepository } from '@/infrastructure/mock/MockCustomerRepository';
import { MockCSATRepository } from '@/infrastructure/mock/MockCSATRepository';

const useSupabase = !!import.meta.env.VITE_SUPABASE_URL;

let customerRepo: ICustomerRepository | null = null;
let csatRepo: ICSATRepository | null = null;

export function getCustomerRepository(): ICustomerRepository {
  if (!customerRepo) customerRepo = useSupabase ? new SupabaseCustomerRepository() : new MockCustomerRepository();
  return customerRepo;
}

/** @internal test only */
export function _setCustomerRepository(repo: ICustomerRepository) { customerRepo = repo; }

export function getCSATRepository(): ICSATRepository {
  if (!csatRepo) csatRepo = useSupabase ? new SupabaseCSATRepository() : new MockCSATRepository();
  return csatRepo;
}

/** @internal test only */
export function _setCSATRepository(repo: ICSATRepository) { csatRepo = repo; }
