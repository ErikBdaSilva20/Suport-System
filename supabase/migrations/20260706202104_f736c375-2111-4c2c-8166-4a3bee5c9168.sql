
-- 1) Trigger passa a SEMPRE criar profile; a proteção contra signup público
--    é feita no fluxo de auth (check-signup-allowed) e não mais aqui, para
--    não quebrar convites/criação via admin API.
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_count int;
  assigned_role user_role;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  assigned_role := CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'agent'::user_role END;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    assigned_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2) Backfill dos profiles que ficaram órfãos porque a versão antiga do trigger lançava exceção.
INSERT INTO public.profiles (id, full_name, email, role, is_active)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  CASE WHEN u.email = 'gabrielteixeira0814@gmail.com' THEN 'admin'::user_role ELSE 'agent'::user_role END,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
