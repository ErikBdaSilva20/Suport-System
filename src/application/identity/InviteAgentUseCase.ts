import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/domain/identity/value-objects/UserRole';

export type InviteMode = 'email' | 'manual';

export interface InviteAgentResult {
  userId?: string;
  mode: InviteMode;
  tempPassword?: string;
}

export class InviteAgentUseCase {
  async execute(
    email: string,
    invitedBy: string,
    role: UserRole = 'agent',
    mode: InviteMode = 'email',
  ): Promise<InviteAgentResult> {
    const { data, error } = await supabase.functions.invoke('invite-agent', {
      body: { email, invitedBy, role, mode },
    });
    if (error) throw error;
    return {
      userId: data?.userId,
      mode: (data?.mode ?? mode) as InviteMode,
      tempPassword: data?.tempPassword,
    };
  }
}
