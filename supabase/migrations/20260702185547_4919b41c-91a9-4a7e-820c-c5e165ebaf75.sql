
UPDATE public.tickets SET status='pending' WHERE status IN ('in_progress','waiting_customer');
UPDATE public.tickets SET status='resolved' WHERE status='closed';

UPDATE public.ticket_ai_suggestions SET suggested_status='pending' WHERE suggested_status IN ('in_progress','waiting_customer');
UPDATE public.ticket_ai_suggestions SET suggested_status='resolved' WHERE suggested_status='closed';

DROP TRIGGER IF EXISTS trg_ticket_status_changed ON public.tickets;

ALTER TYPE public.ticket_status RENAME TO ticket_status_old;
CREATE TYPE public.ticket_status AS ENUM ('open','pending','resolved');

ALTER TABLE public.tickets
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.ticket_status USING status::text::public.ticket_status,
  ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE public.ticket_ai_suggestions
  ALTER COLUMN suggested_status TYPE public.ticket_status USING suggested_status::text::public.ticket_status;

DROP TYPE public.ticket_status_old;

CREATE OR REPLACE FUNCTION public.on_ticket_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN NEW.resolved_at = now(); END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_ticket_status_changed
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.on_ticket_status_changed();
