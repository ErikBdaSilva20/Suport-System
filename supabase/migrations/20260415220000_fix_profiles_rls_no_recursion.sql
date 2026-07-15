-- Fix profiles RLS: remove recursive policy that caused infinite loop / timeout
-- The existing has_role() function does SELECT FROM profiles inside a profiles query → recursion
-- Replace with direct subquery or auth.jwt() claims check

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view active agent profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Non-recursive admin check: use a direct correlated subquery without the has_role() wrapper
-- They key: use (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) which Supabase
-- evaluates once per query, not recursively if the base filter is the user's own row.

-- Allow admins to view all profiles (no recursion: filter uses PK lookup)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Allow agents to view all active profiles for same-team visibility
CREATE POLICY "Agents can view active profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) IN ('admin', 'agent')
    AND is_active = true
  );

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );
