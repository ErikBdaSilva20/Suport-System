import { describe, it, expect } from 'vitest';
import { Ticket, type TicketProps } from './Ticket';

function makeTicket(overrides: Partial<TicketProps> = {}): Ticket {
  return Ticket.create({
    id: 'tk-1',
    number: 1,
    subject: 'Test',
    description: 'desc',
    status: 'open',
    priority: 'medium',
    channel: 'email',
    customerId: 'c-1',
    assignedAgentId: null,
    tagIds: [],
    slaStatus: 'ok',
    slaFirstResponseDue: null,
    slaResolutionDue: null,
    firstResponseAt: null,
    resolvedAt: null,
    closedAt: null,
    emailMessageId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('Ticket', () => {
  describe('canTransitionTo', () => {
    const validTransitions: [TicketProps['status'], TicketProps['status']][] = [
      ['open', 'pending'],
      ['open', 'resolved'],
      ['pending', 'open'],
      ['pending', 'resolved'],
      ['resolved', 'open'],
    ];

    it.each(validTransitions)('%s → %s should be valid', (from, to) => {
      expect(makeTicket({ status: from }).canTransitionTo(to)).toBe(true);
    });

    const invalidTransitions: [TicketProps['status'], TicketProps['status']][] = [
      ['open', 'open'],
      ['pending', 'pending'],
      ['resolved', 'resolved'],
      ['resolved', 'pending'],
    ];

    it.each(invalidTransitions)('%s → %s should be invalid', (from, to) => {
      expect(makeTicket({ status: from }).canTransitionTo(to)).toBe(false);
    });
  });

  describe('isAtRisk', () => {
    it('returns true for warning', () => {
      expect(makeTicket({ slaStatus: 'warning' }).isAtRisk()).toBe(true);
    });
    it('returns true for breached', () => {
      expect(makeTicket({ slaStatus: 'breached' }).isAtRisk()).toBe(true);
    });
    it('returns false for ok', () => {
      expect(makeTicket({ slaStatus: 'ok' }).isAtRisk()).toBe(false);
    });
  });

  describe('toPlainObject', () => {
    it('returns all fields as a plain object', () => {
      const ticket = makeTicket({ subject: 'Hello' });
      const plain = ticket.toPlainObject();
      expect(plain.subject).toBe('Hello');
      expect(plain).not.toBe(ticket);
    });
  });
});
