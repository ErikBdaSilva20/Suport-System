import type { ICSATRepository } from '@/domain/customer-portal/repositories/ICSATRepository';
import { CSATResponse, type CSATResponseProps } from '@/domain/customer-portal/entities/CSATResponse';
import { mockCSATResponses } from '@/data/mockData';

function toLegacy(c: typeof mockCSATResponses[number]): CSATResponseProps {
  return {
    id: c.id,
    ticketId: c.ticket_id,
    customerId: c.customer_id,
    rating: c.score,
    comment: c.comment ?? null,
    token: `token-${c.id}`,
    submittedAt: new Date(c.created_at),
    createdAt: new Date(c.created_at),
  };
}

export class MockCSATRepository implements ICSATRepository {
  private responses: CSATResponseProps[];

  constructor() {
    this.responses = mockCSATResponses.map(toLegacy);
  }

  async findByToken(token: string): Promise<CSATResponse | null> {
    const r = this.responses.find(r => r.token === token);
    return r ? CSATResponse.create(r) : null;
  }

  async submit(token: string, rating: number, comment?: string): Promise<CSATResponse> {
    const idx = this.responses.findIndex(r => r.token === token);
    if (idx === -1) throw new Error(`CSAT token ${token} not found`);
    this.responses[idx] = { ...this.responses[idx], rating, comment: comment ?? null, submittedAt: new Date() };
    return CSATResponse.create(this.responses[idx]);
  }

  async avgRating(since?: Date): Promise<number> {
    let submitted = this.responses.filter(r => r.submittedAt);
    if (since) submitted = submitted.filter(r => r.submittedAt! >= since);
    if (!submitted.length) return 0;
    return submitted.reduce((sum, r) => sum + r.rating, 0) / submitted.length;
  }
}
