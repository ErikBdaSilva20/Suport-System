-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert (via triggers)"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger: ticket assigned
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_num int;
  ticket_subject text;
BEGIN
  IF NEW.assigned_agent_id IS NOT NULL
     AND NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, ticket_id)
    VALUES (
      NEW.assigned_agent_id,
      'ticket_assigned',
      'Novo ticket atribuído a você',
      'Ticket #' || NEW.number || ': ' || NEW.subject,
      '/tickets/' || NEW.id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ticket_assigned
AFTER UPDATE OF assigned_agent_id ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_assigned();

-- Trigger: new customer message
CREATE OR REPLACE FUNCTION public.notify_new_customer_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
BEGIN
  IF NEW.sender_type = 'customer' AND NEW.message_type = 'public_reply' THEN
    SELECT id, number, subject, assigned_agent_id INTO t
    FROM public.tickets WHERE id = NEW.ticket_id;
    IF t.assigned_agent_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, ticket_id)
      VALUES (
        t.assigned_agent_id,
        'new_message',
        'Nova resposta do cliente',
        'Ticket #' || t.number || ': ' || t.subject,
        '/tickets/' || t.id,
        t.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_customer_message
AFTER INSERT ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_customer_message();

-- Trigger: AI suggestion created
CREATE OR REPLACE FUNCTION public.notify_ai_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
BEGIN
  SELECT id, number, subject, assigned_agent_id INTO t
  FROM public.tickets WHERE id = NEW.ticket_id;
  IF t.assigned_agent_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, ticket_id)
    VALUES (
      t.assigned_agent_id,
      'ai_suggestion',
      'Nova sugestão da IA',
      'Ticket #' || t.number || ': ' || t.subject,
      '/tickets/' || t.id,
      t.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ai_suggestion
AFTER INSERT ON public.ticket_ai_suggestions
FOR EACH ROW EXECUTE FUNCTION public.notify_ai_suggestion();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Seed: create one notification per agent for each pending AI suggestion on their tickets
INSERT INTO public.notifications (user_id, type, title, body, link, ticket_id)
SELECT t.assigned_agent_id, 'ai_suggestion',
       'Nova sugestão da IA',
       'Ticket #' || t.number || ': ' || t.subject,
       '/tickets/' || t.id,
       t.id
FROM public.ticket_ai_suggestions s
JOIN public.tickets t ON t.id = s.ticket_id
WHERE s.status = 'pending' AND t.assigned_agent_id IS NOT NULL;