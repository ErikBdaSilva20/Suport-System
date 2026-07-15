import { describe, it, expect } from 'vitest';
import { TicketMessage } from './TicketMessage';

function makeMsg(messageType: 'public_reply' | 'internal_note' | 'system') {
  return TicketMessage.create({
    id: 'msg-1',
    ticketId: 'tk-1',
    senderType: 'agent',
    senderId: 'a-1',
    senderName: 'Agent',
    senderAvatar: null,
    messageType,
    body: 'test',
    createdAt: new Date(),
  });
}

describe('TicketMessage', () => {
  describe('isVisibleToCustomer', () => {
    it('true for public_reply', () => {
      expect(makeMsg('public_reply').isVisibleToCustomer()).toBe(true);
    });
    it('true for system', () => {
      expect(makeMsg('system').isVisibleToCustomer()).toBe(true);
    });
    it('false for internal_note', () => {
      expect(makeMsg('internal_note').isVisibleToCustomer()).toBe(false);
    });
  });
});
