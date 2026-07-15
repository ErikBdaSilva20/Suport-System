DROP VIEW IF EXISTS public.settings_public;
CREATE VIEW public.settings_public
WITH (security_invoker = true) AS
SELECT
  id, company_name, company_logo_url, timezone,
  business_hours_start, business_hours_end, business_days,
  support_email, primary_color, mailgun_api_key_masked, mailgun_domain,
  created_at, updated_at
FROM public.settings;