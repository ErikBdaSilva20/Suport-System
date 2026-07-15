
ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by text NULL;

-- Anon (client) can soft-delete only their own client messages in active chats
CREATE POLICY "Anon soft-delete own client messages"
ON public.live_chat_messages
FOR UPDATE
TO anon
USING (
  sender_type = 'client'
  AND deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = live_chat_messages.ticket_id AND t.chat_status = 'active')
)
WITH CHECK (
  sender_type = 'client'
  AND deleted_at IS NOT NULL
  AND deleted_by = 'client'
  AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = live_chat_messages.ticket_id AND t.chat_status = 'active')
);

-- Ensure realtime emits UPDATE payloads with full row
ALTER TABLE public.live_chat_messages REPLICA IDENTITY FULL;
