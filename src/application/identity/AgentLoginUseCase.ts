import { getProfileRepository } from '@/infrastructure/registries/identity';
import type { Profile } from '@/domain/identity/entities/Profile';

// Stub — will be replaced with real auth
export class AgentLoginUseCase {
  async execute(_email: string, _password: string): Promise<Profile | null> {
    // For now, return first agent as logged in
    const agents = await getProfileRepository().listAgents(true);
    return agents[0] ?? null;
  }
}
