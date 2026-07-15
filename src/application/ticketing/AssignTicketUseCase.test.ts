import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssignTicketUseCase } from './AssignTicketUseCase';
import { MockTicketRepository } from '@/infrastructure/mock/MockTicketRepository';
import { MockAuditLogRepository } from '@/infrastructure/mock/MockAuditLogRepository';
import { _setTicketRepository, _setAuditLogRepository } from '@/infrastructure/registries/ticketing';

describe('AssignTicketUseCase', () => {
  let ticketRepo: MockTicketRepository;
  let auditRepo: MockAuditLogRepository;
  let uc: AssignTicketUseCase;

  beforeEach(() => {
    ticketRepo = new MockTicketRepository();
    auditRepo = new MockAuditLogRepository();
    _setTicketRepository(ticketRepo);
    _setAuditLogRepository(auditRepo);
    uc = new AssignTicketUseCase();
  });

  it('calls auditRepo with Ticket atribuído', async () => {
    const tickets = await ticketRepo.list({});
    const ticket = tickets.tickets[0];
    const spy = vi.spyOn(auditRepo, 'create');

    await uc.execute(ticket.id, 'agent-1', 'Agent Name');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ action: 'Ticket atribuído' }));
  });

  it('calls auditRepo with Atribuição removida when agentId is null', async () => {
    const tickets = await ticketRepo.list({});
    const ticket = tickets.tickets[0];
    const spy = vi.spyOn(auditRepo, 'create');

    await uc.execute(ticket.id, null, 'Agent Name');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ action: 'Atribuição removida' }));
  });

  it('throws for non-existent ticket', async () => {
    await expect(uc.execute('non-existent', 'agent-1', 'Agent')).rejects.toThrow();
  });
});
