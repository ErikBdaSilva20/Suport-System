
DROP VIEW IF EXISTS public.settings_public;

ALTER TABLE public.settings
  DROP COLUMN IF EXISTS mailgun_api_key,
  DROP COLUMN IF EXISTS mailgun_api_key_masked,
  DROP COLUMN IF EXISTS mailgun_domain,
  DROP COLUMN IF EXISTS mailgun_webhook_signing_key,
  DROP COLUMN IF EXISTS mailgun_webhook_signing_key_masked;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS resend_webhook_secret text,
  ADD COLUMN IF NOT EXISTS resend_webhook_secret_masked text,
  ADD COLUMN IF NOT EXISTS resend_from_email text;

CREATE VIEW public.settings_public
WITH (security_invoker = true) AS
SELECT
  id, company_name, company_logo_url, timezone,
  business_hours_start, business_hours_end, business_days,
  support_email, primary_color,
  resend_api_key_masked, resend_webhook_secret_masked, resend_from_email,
  app_base_url,
  created_at, updated_at
FROM public.settings;
