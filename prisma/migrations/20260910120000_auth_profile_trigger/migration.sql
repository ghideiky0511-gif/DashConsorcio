-- Cria automaticamente uma linha em public.profiles para todo novo usuário do
-- Supabase Auth, com o MESMO id. Elimina o descompasso de id que causava loop
-- infinito de redirect (usuário autenticado sem profile -> /login -> / -> ...).
--
-- Política escolhida: profile novo entra ATIVO com papel VISUALIZADOR (só leitura).
-- Um ADMIN promove para OPERADOR/ADMIN depois, em /usuarios.

-- ─── Função ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, ativo, "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'VISUALIZADOR'::"Role",
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── Trigger em auth.users ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Backfill: usuários que já existem no Auth e não têm profile ───────────────
-- Ignora quem já tem profile por id OU por e-mail (evita violar o unique de email).
INSERT INTO public.profiles (id, nome, email, role, ativo, "createdAt", "updatedAt")
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    split_part(u.email, '@', 1)
  ),
  u.email,
  'VISUALIZADOR'::"Role",
  true,
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles pe WHERE pe.email = u.email);
