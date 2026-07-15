
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS zendesk_webhook_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zendesk_subdomain text,
  ADD COLUMN IF NOT EXISTS zendesk_agent_email text,
  ADD COLUMN IF NOT EXISTS zendesk_api_token text,
  ADD COLUMN IF NOT EXISTS zendesk_api_token_masked text;
