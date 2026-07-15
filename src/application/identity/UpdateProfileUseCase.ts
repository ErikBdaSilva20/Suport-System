import { getProfileRepository } from '@/infrastructure/registries/identity';
import type { Profile } from '@/domain/identity/entities/Profile';

export interface UpdateProfileInput {
  id: string;
  fullName?: string;
  avatarUrl?: string | null;
}

export class UpdateProfileUseCase {
  async execute(input: UpdateProfileInput): Promise<Profile> {
    const changes: { fullName?: string; avatarUrl?: string | null } = {};
    if (input.fullName !== undefined) changes.fullName = input.fullName.trim();
    if (input.avatarUrl !== undefined) changes.avatarUrl = input.avatarUrl;
    return getProfileRepository().update(input.id, changes);
  }
}
