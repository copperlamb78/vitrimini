-- ============================================================================
-- VitriMini — Preservar histórico financeiro (CatalogPayment) ao excluir vitrine
-- Execute no SQL Editor do Supabase de produção ANTES do deploy no Render.
-- ============================================================================

-- 1. Adiciona colunas de snapshot (idempotente)
ALTER TABLE "public"."CatalogPayment"
  ADD COLUMN IF NOT EXISTS "catalogNameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "catalogSlugSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerEmailSnapshot" TEXT;

-- 2. Backfill dos registros existentes onde os snapshots ainda estão nulos
UPDATE "public"."CatalogPayment" AS cp
SET
  "catalogNameSnapshot" = COALESCE(cp."catalogNameSnapshot", c."storeName"),
  "catalogSlugSnapshot" = COALESCE(cp."catalogSlugSnapshot", c."slug"),
  "ownerEmailSnapshot"  = COALESCE(cp."ownerEmailSnapshot", u."email")
FROM "public"."Catalog" AS c
JOIN "public"."User" AS u ON u."id" = c."userId"
WHERE cp."catalogId" = c."id"
  AND (
    cp."catalogNameSnapshot" IS NULL
    OR cp."catalogSlugSnapshot" IS NULL
    OR cp."ownerEmailSnapshot" IS NULL
  );

-- 3. Torna catalogId nullable
ALTER TABLE "public"."CatalogPayment"
  ALTER COLUMN "catalogId" DROP NOT NULL;

-- 4. Troca a FK de CatalogPayment.catalogId -> Catalog.id para ON DELETE SET NULL
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT tc.constraint_name
  INTO fk_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'CatalogPayment'
    AND kcu.column_name = 'catalogId'
    AND ccu.table_name = 'Catalog'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "public"."CatalogPayment" DROP CONSTRAINT %I;', fk_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'CatalogPayment'
      AND constraint_name = 'CatalogPayment_catalogId_fkey'
  ) THEN
    ALTER TABLE "public"."CatalogPayment"
      ADD CONSTRAINT "CatalogPayment_catalogId_fkey"
      FOREIGN KEY ("catalogId") REFERENCES "public"."Catalog"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. Garante RLS ativo
ALTER TABLE "public"."CatalogPayment" ENABLE ROW LEVEL SECURITY;
