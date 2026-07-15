-- Schedule recurring jobs for SLA breach check and CSAT survey sending
-- Requires pg_cron extension (enabled in previous migration)

-- Check for SLA breaches every 5 minutes
SELECT cron.schedule(
  'check-sla-breach',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-sla-breach',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Send CSAT surveys every 5 minutes (for resolved tickets > 1h)
SELECT cron.schedule(
  'send-csat-survey',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-csat-survey',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
