-- Defensive unique index to prevent duplicate inbound message processing
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_email_messages_inbound_msgid
  ON public.ticket_email_messages(message_id)
  WHERE direction = 'inbound';