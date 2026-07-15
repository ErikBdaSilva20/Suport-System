
ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size integer,
  ADD COLUMN IF NOT EXISTS attachment_type text;

ALTER TABLE public.live_chat_messages ALTER COLUMN message DROP NOT NULL;

-- Ensure either message or attachment is present
ALTER TABLE public.live_chat_messages
  DROP CONSTRAINT IF EXISTS live_chat_messages_content_check;
ALTER TABLE public.live_chat_messages
  ADD CONSTRAINT live_chat_messages_content_check
  CHECK (message IS NOT NULL OR attachment_path IS NOT NULL);

-- Storage policies for live-chat-attachments bucket
DROP POLICY IF EXISTS "live_chat_att_read" ON storage.objects;
DROP POLICY IF EXISTS "live_chat_att_insert_anon" ON storage.objects;
DROP POLICY IF EXISTS "live_chat_att_insert_auth" ON storage.objects;

-- SELECT: anyone can read attachments belonging to an existing ticket (history stays visible)
CREATE POLICY "live_chat_att_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'live-chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id::text = split_part(storage.objects.name, '/', 1)
  )
);

-- INSERT (anon client): only into folder <ticket_id>/ of a ticket with chat_status='active'
CREATE POLICY "live_chat_att_insert_anon"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'live-chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id::text = split_part(storage.objects.name, '/', 1)
      AND t.chat_status = 'active'
  )
);

-- INSERT (authenticated agent): same rule
CREATE POLICY "live_chat_att_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'live-chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id::text = split_part(storage.objects.name, '/', 1)
      AND t.chat_status = 'active'
  )
);
