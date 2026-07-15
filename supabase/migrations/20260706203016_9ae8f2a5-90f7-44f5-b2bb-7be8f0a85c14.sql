
-- Registra o trigger em auth.users (estava ausente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

-- Backfill de quem ficou sem profile
INSERT INTO public.profiles (id, full_name, email, role, is_active)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  'agent'::user_role,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
