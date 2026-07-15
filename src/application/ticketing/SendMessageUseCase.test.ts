import { describe, it, expect, beforeEach } from 'vitest';
import { SendMessageUseCase } from './SendMessageUseCase';
import { MockTicketRepository } from '@/infrastructure/mock/MockTicketRepository';
import { MockTicketMessageRepository } from '@/infrastructure/mock/MockTicketMessageRepository';
import { MockAuditLogRepository } from '@/infrastructure/mock/MockAuditLogRepository';
import { _setTicketRepository, _setTicketMessageRepository, _setAuditLogRepository } from '@/infrastructure/registries/ticketing';

describe('SendMessageUseCase', () => {
  let ticketRepo: MockTicketRepository;
  let msgRepo: MockTicketMessageRepository;
  let auditRepo: MockAuditLogRepository;
  let uc: SendMessageUseCase;

  beforeEach(() => {
    ticketRepo = new MockTicketRepository();
    msgRepo = new MockTicketMessageRepository();
    auditRepo = new MockAuditLogRepository();
    _setTicketRepository(ticketRepo);
    _setTicketMessageRepository(msgRepo);
    _setAuditLogRepository(auditRepo);
    uc = new SendMessageUseCase();
  });

  it('fills firstResponseAt on first agent reply', async () => {
    const tickets = await ticketRepo.list({});
    const ticket = tickets.tickets.find(t => !t.toPlainObject().firstResponseAt);
    if (!ticket) throw new Error('No ticket without firstResponseAt');

    await uc.execute({
      ticketId: ticket.id,
      senderType: 'agent',
      senderId: 'a-1',
      senderName: 'Agent',
      senderAvatar: null,
      messageType: 'public_reply',
      body: 'Hello',
    });

    const updated = await ticketRepo.findById(ticket.id);
    expect(updated!.toPlainObject().firstResponseAt).toBeInstanceOf(Date);
  });

  it('does not overwrite existing firstResponseAt', async () => {
    const tickets = await ticketRepo.list({});
    const ticket = tickets.tickets[0];
    const existingDate = new Date('2025-01-01T00:00:00Z');
    await ticketRepo.update(ticket.id, { firstResponseAt: existingDate });

    await uc.execute({
      ticketId: ticket.id,
      senderType: 'agent',
      senderId: 'a-1',
      senderName: 'Agent',
      senderAvatar: null,
      messageType: 'public_reply',
      body: 'Follow up',
    });

    const updated = await ticketRepo.findById(ticket.id);
    expect(updated!.toPlainObject().firstResponseAt!.getTime()).toBe(existingDate.getTime());
  });

  it('creates audit log entry after sending', async () => {
    const tickets = await ticketRepo.list({});
    const ticket = tickets.tickets[0];

    await uc.execute({
      ticketId: ticket.id,
      senderType: 'agent',
      senderId: 'a-1',
      senderName: 'Agent',
      senderAvatar: null,
      messageType: 'public_reply',
      body: 'Hello',
    });

    const logs = await auditRepo.findByTicketId(ticket.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[logs.length - 1].action).toBe('Mensagem enviada');
  });
});
