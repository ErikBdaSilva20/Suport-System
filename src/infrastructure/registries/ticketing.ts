import type { ITicketRepository } from '@/domain/ticketing/repositories/ITicketRepository';
import type { ITicketMessageRepository } from '@/domain/ticketing/repositories/ITicketMessageRepository';
import type { IAuditLogRepository } from '@/domain/ticketing/repositories/IAuditLogRepository';
import type { ITicketParticipantRepository } from '@/domain/ticketing/repositories/ITicketParticipantRepository';
import { SupabaseTicketRepository } from '@/infrastructure/supabase/ticketing/SupabaseTicketRepository';
import { SupabaseTicketMessageRepository } from '@/infrastructure/supabase/ticketing/SupabaseTicketMessageRepository';
import { SupabaseAuditLogRepository } from '@/infrastructure/supabase/ticketing/SupabaseAuditLogRepository';
import { SupabaseTicketParticipantRepository } from '@/infrastructure/supabase/ticketing/SupabaseTicketParticipantRepository';
import { MockTicketRepository } from '@/infrastructure/mock/MockTicketRepository';
import { MockTicketMessageRepository } from '@/infrastructure/mock/MockTicketMessageRepository';
import { MockAuditLogRepository } from '@/infrastructure/mock/MockAuditLogRepository';

const useSupabase = !!import.meta.env.VITE_SUPABASE_URL;

let ticketRepo: ITicketRepository | null = null;
let messageRepo: ITicketMessageRepository | null = null;
let auditRepo: IAuditLogRepository | null = null;
let participantRepo: ITicketParticipantRepository | null = null;

export function getTicketRepository(): ITicketRepository {
  if (!ticketRepo) ticketRepo = useSupabase ? new SupabaseTicketRepository() : new MockTicketRepository();
  return ticketRepo;
}

export function getTicketMessageRepository(): ITicketMessageRepository {
  if (!messageRepo) messageRepo = useSupabase ? new SupabaseTicketMessageRepository() : new MockTicketMessageRepository();
  return messageRepo;
}

export function getAuditLogRepository(): IAuditLogRepository {
  if (!auditRepo) auditRepo = useSupabase ? new SupabaseAuditLogRepository() : new MockAuditLogRepository();
  return auditRepo;
}

export function _setTicketRepository(repo: ITicketRepository) {
  ticketRepo = repo;
}

export function _setTicketMessageRepository(repo: ITicketMessageRepository) {
  messageRepo = repo;
}

export function _setAuditLogRepository(repo: IAuditLogRepository) {
  auditRepo = repo;
}

export function getTicketParticipantRepository(): ITicketParticipantRepository {
  if (!participantRepo) {
    if (!useSupabase) throw new Error('TicketParticipantRepository requires Supabase');
    participantRepo = new SupabaseTicketParticipantRepository();
  }
  return participantRepo;
}

export function _setTicketParticipantRepository(repo: ITicketParticipantRepository) {
  participantRepo = repo;
}
