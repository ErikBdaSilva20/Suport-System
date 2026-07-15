import type { IProfileRepository } from '@/domain/identity/repositories/IProfileRepository';
import { Profile, type ProfileProps } from '@/domain/identity/entities/Profile';
import { mockProfiles } from '@/data/mockData';

function toLegacy(p: typeof mockProfiles[number]): ProfileProps {
  return {
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    role: p.role as ProfileProps['role'],
    avatarUrl: p.avatar_url ?? null,
    isActive: p.is_active,
  };
}

export class MockProfileRepository implements IProfileRepository {
  private profiles: ProfileProps[];

  constructor() {
    this.profiles = mockProfiles.map(toLegacy);
  }

  async findById(id: string): Promise<Profile | null> {
    const p = this.profiles.find(p => p.id === id);
    return p ? Profile.create(p) : null;
  }

  async findByEmail(email: string): Promise<Profile | null> {
    const p = this.profiles.find(p => p.email === email);
    return p ? Profile.create(p) : null;
  }

  async listAgents(onlyActive?: boolean): Promise<Profile[]> {
    let result = this.profiles;
    if (onlyActive) result = result.filter(p => p.isActive);
    return result.map(p => Profile.create(p));
  }

  async update(id: string, changes: Partial<Omit<ProfileProps, 'id'>>): Promise<Profile> {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Profile ${id} not found`);
    this.profiles[idx] = { ...this.profiles[idx], ...changes };
    return Profile.create(this.profiles[idx]);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx !== -1) this.profiles[idx].isActive = isActive;
  }
}
