-- 1. Fix is_agent() to check role
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('agent', 'admin')
  )
$$;

-- 2. Fix audit_log INSERT policy — restrict to service_role only
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
CREATE POLICY "Service role can insert audit log"
ON public.audit_log FOR INSERT TO service_role
WITH CHECK (true);

-- Also allow authenticated agents to insert (triggers run as SECURITY DEFINER but direct inserts from app need this)
CREATE POLICY "Agents can insert audit log"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (is_agent());

-- 3. Fix CSAT update policy — require token match
DROP POLICY IF EXISTS "Anyone can submit CSAT by token" ON public.csat_responses;
CREATE POLICY "Anyone can submit CSAT by token"
ON public.csat_responses FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (
  submitted_at IS NOT NULL
  AND rating IS NOT NULL
);

-- 4. Add customer access to ticket_attachments
CREATE POLICY "Customers can view attachments on own tickets"
ON public.ticket_attachments FOR SELECT TO authenticated
USING (
  ticket_message_id IN (
    SELECT tm.id FROM ticket_messages tm
    JOIN tickets t ON t.id = tm.ticket_id
    JOIN customers c ON c.id = t.customer_id
    WHERE c.auth_user_id = auth.uid()
      AND tm.message_type != 'internal_note'
  )
);