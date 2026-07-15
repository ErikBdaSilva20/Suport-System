CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
  assigned_role user_role;
  is_invited boolean;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  is_invited := NEW.invited_at IS NOT NULL;

  -- Block public signups after the first user; only invited users allowed
  IF user_count > 0 AND NOT is_invited THEN
    RAISE EXCEPTION 'Signup disabled. Contact administrator for an invite.'
      USING ERRCODE = 'check_violation';
  END IF;

  assigned_role := CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'agent'::user_role END;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    assigned_role
  );
  RETURN NEW;
END;
$function$;