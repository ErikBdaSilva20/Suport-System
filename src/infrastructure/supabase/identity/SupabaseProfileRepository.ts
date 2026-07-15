import { supabase } from '@/integrations/supabase/client';
import type { IProfileRepository } from '@/domain/identity/repositories/IProfileRepository';
import { Profile } from '@/domain/identity/entities/Profile';
import type { ProfileProps } from '@/domain/identity/entities/Profile';
import type { UserRole } from '@/domain/identity/value-objects/UserRole';
import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export class SupabaseProfileRepository implements IProfileRepository {
  private toEntity(row: ProfileRow): Profile {
    return Profile.create({
      id: row.id, fullName: row.full_name, email: row.email,
      role: row.role as UserRole, avatarUrl: row.avatar_url, isActive: row.is_active,
    });
  }

  async findById(id: string): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return data ? this.toEntity(data) : null;
  }

  async findByEmail(email: string): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('email', email).single();
    return data ? this.toEntity(data) : null;
  }

  async listAgents(onlyActive?: boolean): Promise<Profile[]> {
    let query = supabase.from('profiles').select('*');
    if (onlyActive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(r => this.toEntity(r));
  }

  async update(id: string, changes: Partial<Omit<ProfileProps, 'id'>>): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').update({
      ...(changes.fullName !== undefined && { full_name: changes.fullName }),
      ...(changes.email !== undefined && { email: changes.email }),
      ...(changes.role !== undefined && { role: changes.role }),
      ...(changes.avatarUrl !== undefined && { avatar_url: changes.avatarUrl }),
      ...(changes.isActive !== undefined && { is_active: changes.isActive }),
    }).eq('id', id).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return this.toEntity(data);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  }
}
