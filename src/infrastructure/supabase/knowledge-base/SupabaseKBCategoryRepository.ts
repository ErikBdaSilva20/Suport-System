import { supabase } from '@/integrations/supabase/client';
import type { IKBCategoryRepository } from '@/domain/knowledge-base/repositories/IKBCategoryRepository';
import type { KBCategoryProps } from '@/domain/knowledge-base/entities/KBCategory';
import type { Database } from '@/integrations/supabase/types';

type CatRow = Database['public']['Tables']['kb_categories']['Row'];

function toProps(r: CatRow): KBCategoryProps {
  return { id: r.id, name: r.name, slug: r.slug, sortOrder: r.sort_order };
}

export class SupabaseKBCategoryRepository implements IKBCategoryRepository {
  async list(): Promise<KBCategoryProps[]> {
    const { data } = await supabase.from('kb_categories').select('*').order('sort_order');
    return (data ?? []).map(toProps);
  }

  async create(props: Omit<KBCategoryProps, 'id'>): Promise<KBCategoryProps> {
    const { data, error } = await supabase.from('kb_categories').insert({
      name: props.name, slug: props.slug, sort_order: props.sortOrder ?? 0,
    }).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return toProps(data);
  }

  async update(id: string, changes: Partial<KBCategoryProps>): Promise<KBCategoryProps> {
    const { data, error } = await supabase.from('kb_categories').update({
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.slug !== undefined && { slug: changes.slug }),
      ...(changes.sortOrder !== undefined && { sort_order: changes.sortOrder }),
    }).eq('id', id).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return toProps(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('kb_categories').delete().eq('id', id);
    if (error) throw error;
  }
}
