-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Also allow csat_responses INSERT from service role (edge functions)
CREATE POLICY "Service role can insert CSAT" ON public.csat_responses
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow service role to insert customers (for inbound email)
CREATE POLICY "Service role can insert customers" ON public.customers
  FOR INSERT TO service_role WITH CHECK (true);