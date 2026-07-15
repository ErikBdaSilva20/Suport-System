import type { IKBArticleRepository } from '@/domain/knowledge-base/repositories/IKBArticleRepository';
import type { IKBCategoryRepository } from '@/domain/knowledge-base/repositories/IKBCategoryRepository';
import { SupabaseKBArticleRepository } from '@/infrastructure/supabase/knowledge-base/SupabaseKBArticleRepository';
import { SupabaseKBCategoryRepository } from '@/infrastructure/supabase/knowledge-base/SupabaseKBCategoryRepository';
import { MockKBArticleRepository } from '@/infrastructure/mock/MockKBArticleRepository';
import { MockKBCategoryRepository } from '@/infrastructure/mock/MockKBCategoryRepository';

const useSupabase = !!import.meta.env.VITE_SUPABASE_URL;

let articleRepo: IKBArticleRepository | null = null;
let categoryRepo: IKBCategoryRepository | null = null;

export function getKBArticleRepository(): IKBArticleRepository {
  if (!articleRepo) articleRepo = useSupabase ? new SupabaseKBArticleRepository() : new MockKBArticleRepository();
  return articleRepo;
}

export function getKBCategoryRepository(): IKBCategoryRepository {
  if (!categoryRepo) categoryRepo = useSupabase ? new SupabaseKBCategoryRepository() : new MockKBCategoryRepository();
  return categoryRepo;
}
