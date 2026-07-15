CREATE TABLE public.ticket_email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_email_messages_ticket ON public.ticket_email_messages(ticket_id);
CREATE INDEX idx_ticket_email_messages_message_id ON public.ticket_email_messages(message_id);

ALTER TABLE public.ticket_email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view ticket email messages"
  ON public.ticket_email_messages
  FOR SELECT
  USING (public.is_agent());

CREATE POLICY "Service role can manage ticket email messages"
  ON public.ticket_email_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);