
-- 1. Seed default settings row (idempotent)
INSERT INTO public.settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- 2. Seed default SLA policies if table empty
INSERT INTO public.sla_policies (priority, first_response_minutes, resolution_minutes)
SELECT * FROM (VALUES
  ('urgent'::ticket_priority, 60, 240),
  ('high'::ticket_priority, 240, 480),
  ('medium'::ticket_priority, 480, 1440),
  ('low'::ticket_priority, 1440, 4320)
) AS v(priority, first_response_minutes, resolution_minutes)
WHERE NOT EXISTS (SELECT 1 FROM public.sla_policies);

-- 3. Backfill profiles for existing auth users without one
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  CASE
    WHEN row_number() OVER (ORDER BY u.created_at) = 1
      AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')
    THEN 'admin'::user_role
    ELSE 'agent'::user_role
  END,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. Add new columns to settings for Resend + Mailgun webhook signing key
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS resend_api_key text,
  ADD COLUMN IF NOT EXISTS resend_api_key_masked text,
  ADD COLUMN IF NOT EXISTS mailgun_webhook_signing_key text,
  ADD COLUMN IF NOT EXISTS mailgun_webhook_signing_key_masked text;

-- 5. Update settings_public view to include masked values, never raw secrets
DROP VIEW IF EXISTS public.settings_public;
CREATE VIEW public.settings_public
WITH (security_invoker = true)
AS
SELECT
  id,
  company_name,
  company_logo_url,
  timezone,
  business_hours_start,
  business_hours_end,
  business_days,
  support_email,
  primary_color,
  mailgun_domain,
  mailgun_api_key_masked,
  mailgun_webhook_signing_key_masked,
  resend_api_key_masked,
  created_at,
  updated_at
FROM public.settings;
