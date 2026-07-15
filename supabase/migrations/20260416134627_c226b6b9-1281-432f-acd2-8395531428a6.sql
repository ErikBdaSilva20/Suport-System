
-- Drop the overly permissive policy that exposes mailgun_api_key to everyone
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;

-- Create a secure view that excludes the real API key
CREATE OR REPLACE VIEW public.settings_public AS
SELECT
  id, company_name, company_logo_url, timezone,
  business_hours_start, business_hours_end, business_days,
  support_email, portal_welcome_message, primary_color,
  mailgun_api_key_masked, mailgun_domain,
  created_at, updated_at
FROM public.settings;

-- Grant access to the view for anon and authenticated
GRANT SELECT ON public.settings_public TO anon, authenticated;
