import { getProfileRepository } from '@/infrastructure/registries/identity';
import type { Profile } from '@/domain/identity/entities/Profile';

export class GetCurrentProfileUseCase {
  async execute(userId: string): Promise<Profile | null> {
    return getProfileRepository().findById(userId);
  }
}
