ALTER TABLE public.settings
  ADD COLUMN mailgun_api_key text,
  ADD COLUMN mailgun_domain text;