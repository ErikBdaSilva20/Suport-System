import type { Profile, ProfileProps } from '../entities/Profile';

export interface IProfileReader {
  findById(id: string): Promise<Profile | null>;
  findByEmail(email: string): Promise<Profile | null>;
  listAgents(onlyActive?: boolean): Promise<Profile[]>;
}

export interface IProfileWriter {
  update(id: string, changes: Partial<Omit<ProfileProps, 'id'>>): Promise<Profile>;
  setActive(id: string, isActive: boolean): Promise<void>;
}

export interface IProfileRepository extends IProfileReader, IProfileWriter {}
