import { supabase } from '@/integrations/supabase/client';
import type { ITagRepository } from '@/domain/settings/repositories/ITagRepository';
import type { Tag } from '@/domain/settings/entities/Tag';

export class SupabaseTagRepository implements ITagRepository {
  async list(): Promise<Tag[]> {
    const { data } = await supabase.from('tags').select('*').order('name');
    return (data ?? []).map(r => ({ id: r.id, name: r.name, color: r.color }));
  }

  async create(tag: Omit<Tag, 'id'>): Promise<Tag> {
    const { data, error } = await supabase.from('tags').insert({ name: tag.name, color: tag.color }).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return { id: data.id, name: data.name, color: data.color };
  }

  async update(id: string, changes: Partial<Omit<Tag, 'id'>>): Promise<Tag> {
    const { data, error } = await supabase.from('tags').update(changes).eq('id', id).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return { id: data.id, name: data.name, color: data.color };
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
  }
}
