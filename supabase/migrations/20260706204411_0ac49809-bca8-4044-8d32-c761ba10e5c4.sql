
CREATE OR REPLACE FUNCTION public.notify_ticket_participant_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t record;
BEGIN
  SELECT id, number, subject INTO t FROM public.tickets WHERE id = NEW.ticket_id;
  IF t.id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, ticket_id)
    VALUES (
      NEW.user_id,
      'ticket_participant_added',
      'Você foi adicionado a um ticket',
      'Ticket #' || t.number || ': ' || t.subject,
      '/tickets/' || t.id,
      t.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ticket_participant_added ON public.ticket_participants;
CREATE TRIGGER on_ticket_participant_added
AFTER INSERT ON public.ticket_participants
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_participant_added();
