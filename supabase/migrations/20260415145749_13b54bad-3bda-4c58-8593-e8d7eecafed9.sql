
-- Customers can create tickets for themselves
CREATE POLICY "Customers can create own tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

-- Customers can insert public_reply messages on own tickets
CREATE POLICY "Customers can insert messages on own tickets"
ON public.ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  message_type = 'public_reply'
  AND sender_type = 'customer'
  AND ticket_id IN (
    SELECT t.id FROM public.tickets t
    JOIN public.customers c ON c.id = t.customer_id
    WHERE c.auth_user_id = auth.uid()
  )
);

-- Customers can view own CSAT responses
CREATE POLICY "Customers can view own CSAT"
ON public.csat_responses
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  )
);

-- Anyone can view settings (portal needs company name, logo, primary color)
CREATE POLICY "Anyone can view settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Anyone can view published public KB articles (already exists but ensure anon too)
-- The existing policy uses `public` role which covers both anon and authenticated

-- Allow anon to update CSAT by token (existing policy uses public role, covers anon)
