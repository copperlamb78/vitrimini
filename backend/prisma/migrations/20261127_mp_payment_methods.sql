-- ============================================================================
-- VitriMini — Switches individuais Pix / Cartão no Mercado Pago (Idempotente)
-- Execute no SQL Editor do Supabase ANTES do deploy no Render.
-- ============================================================================

ALTER TABLE "public"."Catalog"
  ADD COLUMN IF NOT EXISTS "mpAcceptPix" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "mpAcceptCard" BOOLEAN NOT NULL DEFAULT true;
