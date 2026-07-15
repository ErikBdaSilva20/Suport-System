
-- Fix profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR public.has_role(auth.uid(), 'admin')
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "Agents can view active profiles" ON public.profiles;
CREATE POLICY "Agents can view active agent profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_agent()
    AND role IN ('admin', 'agent')
  );

-- Fix kb_categories: agents can manage
DROP POLICY IF EXISTS "Admins can manage KB categories" ON public.kb_categories;
CREATE POLICY "Agents can manage KB categories"
  ON public.kb_categories FOR ALL
  TO authenticated
  USING (public.is_agent())
  WITH CHECK (public.is_agent());

-- Fix kb_articles: recreate agent management policy
DROP POLICY IF EXISTS "Agents can manage articles" ON public.kb_articles;
CREATE POLICY "Agents can manage articles"
  ON public.kb_articles FOR ALL
  TO authenticated
  USING (public.is_agent())
  WITH CHECK (public.is_agent());
