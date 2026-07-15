
-- Create a SECURITY DEFINER function to get current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

-- Drop existing recursive profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view active agent profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate non-recursive policies using get_my_role()
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (get_my_role() = 'admin');

CREATE POLICY "Agents can view agent and admin profiles"
ON public.profiles FOR SELECT TO authenticated
USING (get_my_role() = 'agent' AND role IN ('admin', 'agent'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');
