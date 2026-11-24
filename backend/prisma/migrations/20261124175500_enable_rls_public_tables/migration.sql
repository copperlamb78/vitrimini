-- Habilita Row-Level Security (RLS) em todas as tabelas do schema public.
-- Sem policies permissivas: bloqueia acesso via API REST pública (PostgREST / anon / authenticated),
-- mantendo 100% do acesso do backend Express + Prisma (role privilegiada postgres com BYPASSRLS).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
