import { supabase } from '@/integrations/supabase/client';
import type { ICSATRepository } from '@/domain/customer-portal/repositories/ICSATRepository';
import { CSATResponse } from '@/domain/customer-portal/entities/CSATResponse';

export class SupabaseCSATRepository implements ICSATRepository {
  async findByToken(token: string): Promise<CSATResponse | null> {
    const { data, error } = await supabase.from('csat_responses').select('*').eq('token', token).single();
    if (error || !data) return null;
    return CSATResponse.create({
      id: data.id, ticketId: data.ticket_id, customerId: data.customer_id,
      rating: data.rating ?? 0, comment: data.comment, token: data.token,
      submittedAt: data.submitted_at ? new Date(data.submitted_at) : null,
      createdAt: new Date(data.created_at),
    });
  }

  async submit(token: string, rating: number, comment?: string): Promise<CSATResponse> {
    const { data, error } = await supabase.from('csat_responses')
      .update({ rating, comment: comment ?? null, submitted_at: new Date().toISOString() })
      .eq('token', token).select().single();
    if (error || !data) throw error ?? new Error('Failed to submit CSAT');
    return CSATResponse.create({
      id: data.id, ticketId: data.ticket_id, customerId: data.customer_id,
      rating: data.rating ?? rating, comment: data.comment, token: data.token,
      submittedAt: data.submitted_at ? new Date(data.submitted_at) : null,
      createdAt: new Date(data.created_at),
    });
  }

  async avgRating(since?: Date): Promise<number> {
    let query = supabase.from('csat_responses').select('rating').not('rating', 'is', null);
    if (since) query = query.gte('submitted_at', since.toISOString());
    const { data } = await query;
    if (!data?.length) return 0;
    return data.reduce((sum, r) => sum + (r.rating ?? 0), 0) / data.length;
  }
}
