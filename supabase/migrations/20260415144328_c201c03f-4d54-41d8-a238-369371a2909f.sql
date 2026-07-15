
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.on_ticket_status_changed()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN NEW.resolved_at = now(); END IF;
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN NEW.closed_at = now(); END IF;
  RETURN NEW;
END;
$$;
