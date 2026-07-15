import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateTicketStatusUseCase } from './UpdateTicketStatusUseCase';
import { MockTicketRepository } from '@/infrastructure/mock/MockTicketRepository';
import { MockAuditLogRepository } from '@/infrastructure/mock/MockAuditLogRepository';
import { _setTicketRepository, _setAuditLogRepository } from '@/infrastructure/registries/ticketing';
import { DomainError } from '@/shared/errors/DomainError';

describe('UpdateTicketStatusUseCase', () => {
  let ticketRepo: MockTicketRepository;
  let auditRepo: MockAuditLogRepository;
  let uc: UpdateTicketStatusUseCase;

  beforeEach(() => {
    ticketRepo = new MockTicketRepository();
    auditRepo = new MockAuditLogRepository();
    _setTicketRepository(ticketRepo);
    _setAuditLogRepository(auditRepo);
    uc = new UpdateTicketStatusUseCase();
  });

  it('throws DomainError for invalid transition', async () => {
    const tickets = await ticketRepo.list({});
    const resolvedTicket = tickets.tickets.find(t => t.toPlainObject().status === 'resolved');
    if (!resolvedTicket) throw new Error('No resolved ticket in mock data');

    // resolved → pending is invalid
    await expect(uc.execute(resolvedTicket.id, 'pending', 'Agent')).rejects.toThrow(DomainError);
  });

  it('does not call auditRepo on invalid transition', async () => {
    const tickets = await ticketRepo.list({});
    const resolvedTicket = tickets.tickets.find(t => t.toPlainObject().status === 'resolved');
    if (!resolvedTicket) throw new Error('No resolved ticket');

    const createSpy = vi.spyOn(auditRepo, 'create');
    try { await uc.execute(resolvedTicket.id, 'pending', 'Agent'); } catch {}
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('calls auditRepo with correct action on valid transition', async () => {
    const tickets = await ticketRepo.list({});
    const openTicket = tickets.tickets.find(t => t.toPlainObject().status === 'open');
    if (!openTicket) throw new Error('No open ticket');

    const createSpy = vi.spyOn(auditRepo, 'create');
    await uc.execute(openTicket.id, 'pending', 'Agent');
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'Status alterado' }));
  });

  it('sets resolvedAt when status is resolved', async () => {
    const tickets = await ticketRepo.list({});
    const pendingTicket = tickets.tickets.find(t => t.toPlainObject().status === 'pending');
    if (!pendingTicket) throw new Error('No pending ticket');

    const result = await uc.execute(pendingTicket.id, 'resolved', 'Agent');
    expect(result.ticket.toPlainObject().resolvedAt).toBeInstanceOf(Date);
  });
});
