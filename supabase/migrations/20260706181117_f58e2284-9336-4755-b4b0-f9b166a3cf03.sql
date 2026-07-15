
ALTER TABLE public.live_chat_messages DROP CONSTRAINT live_chat_messages_content_check;
ALTER TABLE public.live_chat_messages ADD CONSTRAINT live_chat_messages_content_check
  CHECK (deleted_at IS NOT NULL OR message IS NOT NULL OR attachment_path IS NOT NULL);
