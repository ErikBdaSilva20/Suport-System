-- 1. Drop view first (depends on portal_welcome_message)
DROP VIEW IF EXISTS public.settings_public;

-- 2. Rename + drop column
ALTER TABLE public.settings RENAME COLUMN portal_base_url TO app_base_url;
ALTER TABLE public.settings DROP COLUMN IF EXISTS portal_welcome_message;

-- 3. Migrate any existing 'portal' channel tickets
UPDATE public.tickets SET channel = 'email' WHERE channel = 'portal';

-- 4. Swap enum without 'portal'
ALTER TABLE public.tickets ALTER COLUMN channel DROP DEFAULT;
ALTER TYPE public.ticket_channel RENAME TO ticket_channel_old;
CREATE TYPE public.ticket_channel AS ENUM ('email', 'chat', 'phone', 'api');
ALTER TABLE public.tickets
  ALTER COLUMN channel TYPE public.ticket_channel
  USING channel::text::public.ticket_channel;
ALTER TABLE public.tickets ALTER COLUMN channel SET DEFAULT 'email'::public.ticket_channel;
DROP TYPE public.ticket_channel_old;

-- 5. Recreate settings_public view without portal_welcome_message
CREATE VIEW public.settings_public AS
SELECT
  id, company_name, company_logo_url, timezone,
  business_hours_start, business_hours_end, business_days,
  support_email, primary_color, mailgun_api_key_masked, mailgun_domain,
  created_at, updated_at
FROM public.settings;