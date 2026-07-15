CREATE TABLE public.ticket_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'reclassify',
  suggested_priority public.ticket_priority NULL,
  suggested_status public.ticket_status NULL,
  reasoning text NOT NULL,
  confidence numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid NULL,
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_ai_suggestions_ticket_status ON public.ticket_ai_suggestions(ticket_id, status);

ALTER TABLE public.ticket_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view ai suggestions"
  ON public.ticket_ai_suggestions FOR SELECT
  USING (public.is_agent());

CREATE POLICY "Agents can update ai suggestions"
  ON public.ticket_ai_suggestions FOR UPDATE
  USING (public.is_agent())
  WITH CHECK (public.is_agent());

CREATE POLICY "Service role can insert ai suggestions"
  ON public.ticket_ai_suggestions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Agents can insert ai suggestions"
  ON public.ticket_ai_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agent());

ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_ai_suggestions;
ALTER TABLE public.ticket_ai_suggestions REPLICA IDENTITY FULL;