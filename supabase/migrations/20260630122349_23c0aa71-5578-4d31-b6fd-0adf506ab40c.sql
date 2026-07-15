
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS zendesk_ticket_id text;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_zendesk_ticket_id_key ON public.tickets(zendesk_ticket_id) WHERE zendesk_ticket_id IS NOT NULL;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS zendesk_webhook_secret text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS zendesk_webhook_secret_masked text;
