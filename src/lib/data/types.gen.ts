// Gerado a partir de supabase/migrations/20260715190000_target_schema.sql,
// supabase/migrations/20260715190200_ticket_category.sql e NeonDB/setup.sql
// (bloco CUSTOMER FEEDBACK).
// PROTEGIDO: contrato com o gateway — não editar à mão fora de uma migration nova.

export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high';
export type FeedbackChannel = 'urgent' | 'general';
export type FeedbackStatus = 'open' | 'read' | 'resolved';

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          phone_e164: string;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          owner_id: string;
          number: number;
          customer_id: string;
          subject: string;
          description: string;
          status: TicketStatus;
          priority: TicketPriority;
          assigned_to: string | null;
          resolved_at: string | null;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      ticket_notes: {
        Row: {
          id: string;
          owner_id: string;
          ticket_id: string;
          body: string;
          created_at: string;
        };
      };
      customer_feedback: {
        Row: {
          id: string;
          owner_id: string;
          channel: FeedbackChannel;
          category: string | null;
          message: string;
          status: FeedbackStatus;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}
