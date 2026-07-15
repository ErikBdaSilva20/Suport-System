
CREATE TABLE public.email_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sender_email text,
  sender_name text,
  subject text,
  message_id text,
  in_reply_to text,
  content_type text,
  status text NOT NULL DEFAULT 'received',
  ticket_id uuid,
  customer_id uuid,
  error_message text,
  raw_headers jsonb
);

ALTER TABLE public.email_inbound_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view inbound events"
  ON public.email_inbound_events FOR SELECT
  USING (is_agent());

CREATE POLICY "Service role can insert inbound events"
  ON public.email_inbound_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update inbound events"
  ON public.email_inbound_events FOR UPDATE
  TO service_role
  USING (true);

CREATE INDEX idx_email_inbound_events_created ON public.email_inbound_events (created_at DESC);
CREATE INDEX idx_email_inbound_events_status ON public.email_inbound_events (status);
