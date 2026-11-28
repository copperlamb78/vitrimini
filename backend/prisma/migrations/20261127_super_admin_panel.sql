-- ============================================================================
-- VitriMini — Super Admin Central Completa (SQL Idempotente para Supabase)
-- Execute no SQL Editor do Supabase ANTES do deploy no Render (prisma db push).
-- ============================================================================

-- 1. Colunas auxiliares em tabelas existentes
ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "public"."Catalog"
  ADD COLUMN IF NOT EXISTS "lastExpirationNoticeStage" TEXT,
  ADD COLUMN IF NOT EXISTS "lastExpirationNoticeAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_lastLoginAt_idx"
  ON "public"."User"("lastLoginAt");

CREATE INDEX IF NOT EXISTS "Catalog_status_expiresAt_idx"
  ON "public"."Catalog"("status", "expiresAt");

CREATE INDEX IF NOT EXISTS "CatalogPayment_catalogId_idx"
  ON "public"."CatalogPayment"("catalogId");

-- 2. AdminAuditLog
CREATE TABLE IF NOT EXISTS "public"."AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetLabel" TEXT,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx"
  ON "public"."AdminAuditLog"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetType_targetId_createdAt_idx"
  ON "public"."AdminAuditLog"("targetType", "targetId", "createdAt");

CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_createdAt_idx"
  ON "public"."AdminAuditLog"("action", "createdAt");

ALTER TABLE "public"."AdminAuditLog" ENABLE ROW LEVEL SECURITY;

-- 3. SystemErrorLog (Central de Falhas Gerais)
CREATE TABLE IF NOT EXISTS "public"."SystemErrorLog" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "route" TEXT,
  "method" TEXT,
  "statusCode" INTEGER,
  "userId" TEXT,
  "catalogId" TEXT,
  "contextJson" JSONB,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolutionNote" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemErrorLog_fingerprint_key"
  ON "public"."SystemErrorLog"("fingerprint");

CREATE INDEX IF NOT EXISTS "SystemErrorLog_status_lastSeenAt_idx"
  ON "public"."SystemErrorLog"("status", "lastSeenAt" DESC);

CREATE INDEX IF NOT EXISTS "SystemErrorLog_source_severity_idx"
  ON "public"."SystemErrorLog"("source", "severity");

CREATE INDEX IF NOT EXISTS "SystemErrorLog_lastSeenAt_idx"
  ON "public"."SystemErrorLog"("lastSeenAt");

ALTER TABLE "public"."SystemErrorLog" ENABLE ROW LEVEL SECURITY;

-- 4. PaymentWebhookLog
CREATE TABLE IF NOT EXISTS "public"."PaymentWebhookLog" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
  "eventType" TEXT NOT NULL,
  "externalResourceId" TEXT,
  "catalogId" TEXT,
  "paymentId" TEXT,
  "status" TEXT NOT NULL,
  "httpStatus" INTEGER,
  "errorMessage" TEXT,
  "payloadJson" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentWebhookLog_createdAt_idx"
  ON "public"."PaymentWebhookLog"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "PaymentWebhookLog_status_createdAt_idx"
  ON "public"."PaymentWebhookLog"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentWebhookLog_externalResourceId_idx"
  ON "public"."PaymentWebhookLog"("externalResourceId");

ALTER TABLE "public"."PaymentWebhookLog" ENABLE ROW LEVEL SECURITY;

-- 5. PromoCoupon & PromoCouponRedemption
CREATE TABLE IF NOT EXISTS "public"."PromoCoupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'EXTENDED_TRIAL',
  "bonusDays" INTEGER NOT NULL,
  "targetPlanCode" TEXT,
  "maxUses" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByAdminId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoCoupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCoupon_code_key"
  ON "public"."PromoCoupon"("code");

CREATE INDEX IF NOT EXISTS "PromoCoupon_isActive_expiresAt_idx"
  ON "public"."PromoCoupon"("isActive", "expiresAt");

ALTER TABLE "public"."PromoCoupon" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PromoCouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "catalogId" TEXT,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoCouponRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromoCouponRedemption_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "public"."PromoCoupon"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromoCouponRedemption_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromoCouponRedemption_catalogId_fkey"
    FOREIGN KEY ("catalogId") REFERENCES "public"."Catalog"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCouponRedemption_couponId_userId_key"
  ON "public"."PromoCouponRedemption"("couponId", "userId");

CREATE INDEX IF NOT EXISTS "PromoCouponRedemption_userId_idx"
  ON "public"."PromoCouponRedemption"("userId");

CREATE INDEX IF NOT EXISTS "PromoCouponRedemption_couponId_redeemedAt_idx"
  ON "public"."PromoCouponRedemption"("couponId", "redeemedAt");

ALTER TABLE "public"."PromoCouponRedemption" ENABLE ROW LEVEL SECURITY;

-- 6. GlobalAnnouncement
CREATE TABLE IF NOT EXISTS "public"."GlobalAnnouncement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "variant" TEXT NOT NULL DEFAULT 'INFO',
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "dismissible" BOOLEAN NOT NULL DEFAULT true,
  "updatedByAdminId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GlobalAnnouncement_isActive_startsAt_endsAt_idx"
  ON "public"."GlobalAnnouncement"("isActive", "startsAt", "endsAt");

ALTER TABLE "public"."GlobalAnnouncement" ENABLE ROW LEVEL SECURITY;

-- 7. SystemSetting (configurações operacionais persistidas, ex: régua de e-mails)
CREATE TABLE IF NOT EXISTS "public"."SystemSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "public"."SystemSetting" ENABLE ROW LEVEL SECURITY;
