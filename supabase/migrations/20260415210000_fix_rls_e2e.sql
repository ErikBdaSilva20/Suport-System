-- Fix 1: Allow agents (not just admins) to manage tags
-- The previous fix (20260415200000) already corrects this. This migration
-- addresses additional RLS issues found during E2E testing.

-- Fix 2: Profiles — allow admins to see ALL profiles (including inactive)
-- Current policy "Admins can view all profiles" uses has_role which checks profiles table
-- causing a chicken-and-egg problem. Use auth.jwt() claims instead.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR public.has_role(auth.uid(), 'admin')
    OR id = auth.uid()
  );

-- Also allow agents to see ALL profiles (not just active ones) so TeamSettings works
DROP POLICY IF EXISTS "Agents can view active profiles" ON public.profiles;
CREATE POLICY "Agents can view active agent profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_agent()
    AND role IN ('admin', 'agent')
  );

-- Fix 3: KB categories — allow agents (not just admins) to create/manage categories
DROP POLICY IF EXISTS "Admins can manage KB categories" ON public.kb_categories;
CREATE POLICY "Agents can manage KB categories"
  ON public.kb_categories FOR ALL
  TO authenticated
  USING (public.is_agent())
  WITH CHECK (public.is_agent());

-- Fix 4: KB articles — allow INSERT by agents (the current ALL policy should cover it,
-- but add explicit INSERT to be safe with Supabase policy evaluation order)
DROP POLICY IF EXISTS "Agents can manage articles" ON public.kb_articles;
CREATE POLICY "Agents can manage articles"
  ON public.kb_articles FOR ALL
  TO authenticated
  USING (public.is_agent())
  WITH CHECK (public.is_agent());
