
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS chat_token uuid,
  ADD COLUMN IF NOT EXISTS chat_status text CHECK (chat_status IN ('inactive','active','ended')) DEFAULT 'inactive';

CREATE UNIQUE INDEX IF NOT EXISTS tickets_chat_token_key ON public.tickets(chat_token) WHERE chat_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('agent','client')),
  sender_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_chat_messages_ticket_idx ON public.live_chat_messages(ticket_id, created_at);

GRANT SELECT, INSERT ON public.live_chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.live_chat_messages TO anon;
GRANT ALL ON public.live_chat_messages TO service_role;

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage live chat" ON public.live_chat_messages
  FOR ALL TO authenticated
  USING (public.is_agent())
  WITH CHECK (public.is_agent());

CREATE POLICY "Anon read active chat messages" ON public.live_chat_messages
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.chat_status = 'active'));

CREATE POLICY "Anon insert client messages" ON public.live_chat_messages
  FOR INSERT TO anon
  WITH CHECK (
    sender_type = 'client'
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.chat_status = 'active')
  );

DROP POLICY IF EXISTS "Anon read ticket by chat_token" ON public.tickets;
CREATE POLICY "Anon read ticket by chat_token" ON public.tickets
  FOR SELECT TO anon
  USING (chat_token IS NOT NULL);

GRANT SELECT (id, subject, chat_token, chat_status) ON public.tickets TO anon;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER TABLE public.live_chat_messages REPLICA IDENTITY FULL;
