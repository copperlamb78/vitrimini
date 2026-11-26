import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { assertValidImageMagicBytes } from '../config/upload.js';
import { markMerchantCache } from '../middlewares/auth.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import {
  activateCatalogFromMockWebhook,
  activateOwnedCatalogMockDirect,
  cancelOwnedCatalogSubscriptionDb,
  confirmAuthorizedSubscriptionPaymentTx,
  confirmCatalogPaymentTx,
  createCatalogPaymentRecord,
  createDraftCatalog,
  createTrialCatalogTx,
  findCatalogByIdForWebhook,
  findCatalogByPreapprovalOrRefForWebhook,
  findCatalogPaymentByGatewayId,
  findFallbackPendingPaymentForWebhook,
  findOwnedCatalogById,
  findOwnedCatalogDetail,
  findOwnedCatalogIdByEditToken,
  findOwnedCatalogPaymentForStatus,
  findOwnedCatalogStatusSummary,
  findOwnedCatalogWithProducts,
  findPendingOwnedCatalogPayment,
  findPendingPaymentByCatalogIdForWebhook,
  findPublicCatalogBySlug,
  findTrialEligibilityData,
  findUserCatalogsAndTrialFlag,
  findUserEmailById,
  markOwnedCatalogExpired,
  PreparedProductPersistenceItem,
  savePendingPreapprovalOnCatalog,
  updateCatalogSubscriptionFieldsForWebhook,
  updateOwnedCatalogAndProductsTx,
  updateOwnedCatalogPaymentId,
} from '../repositories/catalog.repository.js';
import {
  cleanupExpiredCatalogs,
  GRACE_PERIOD_MS,
} from './cleanup.service.js';
import {
  sendCatalogPublishedEmail,
  sendCatalogRenewedEmail,
} from './email.service.js';
import { hasProFeatures } from './mpOAuth.service.js';
import {
  addCalendarMonths,
  calculatePixFeeFallback,
  cancelMercadoPagoPreapproval,
  createCardSubscription,
  createPixPayment,
  fetchMercadoPagoAuthorizedPayment,
  fetchMercadoPagoPayment,
  fetchMercadoPagoPreapproval,
  isMockPixEnabled,
  LEGACY_PLAN_MAP,
  type LegacyPlanCode,
  PLAN_CATALOG,
  PlanCode,
  resolvePlanDefinition,
  searchMercadoPagoAuthorizedPaymentsByPreapproval,
  validateMercadoPagoWebhookSignature,
  verifyMercadoPagoOrder,
} from './payment.service.js';
import { deleteImagesFromR2, uploadImageToR2 } from './r2.service.js';
import { generateUniqueSlug } from '../utils/slug.js';
import {
  bioLinksConfigSchema,
  catalogMetadataSchema,
  productInputSchema,
  storeAppearanceSchema,
} from '../utils/validation.js';

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

export const ALLOWED_THEMES = new Set([
  'rose',
  'red',
  'amber',
  'emerald',
  'purple',
  'zinc',
]);

export type CatalogThemeColor =
  | 'rose'
  | 'red'
  | 'amber'
  | 'emerald'
  | 'purple'
  | 'zinc'
  | (string & {});

export function normalizeThemeColor(raw: unknown): CatalogThemeColor {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (ALLOWED_THEMES.has(trimmed)) {
      return trimmed as CatalogThemeColor;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return 'rose';
}

function extractStoreAppearance(
  bioLinksConfig: unknown
): z.infer<typeof storeAppearanceSchema> | null {
  if (!bioLinksConfig || typeof bioLinksConfig !== 'object') {
    return null;
  }
  const raw = (bioLinksConfig as { storeAppearance?: unknown }).storeAppearance;
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const parsed = storeAppearanceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseBoolean(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
}

function resolveNextPlanType(
  catalog: {
    planType: 'ESSENTIAL' | 'PRO';
    expiresAt: Date | null;
  },
  purchasedPlanType: 'ESSENTIAL' | 'PRO',
  nowMs: number
): 'ESSENTIAL' | 'PRO' {
  const hasActiveRemainingDays =
    catalog.expiresAt !== null && catalog.expiresAt.getTime() > nowMs;
  if (
    hasActiveRemainingDays &&
    catalog.planType === 'PRO' &&
    purchasedPlanType === 'ESSENTIAL'
  ) {
    return 'PRO';
  }
  return purchasedPlanType;
}

async function cancelPreviousPreapprovalIfActive(
  previous: {
    mpPreapprovalId: string | null;
    autoRenew: boolean;
    subscriptionStatus: string | null;
  } | null | undefined,
  newPreapprovalId?: string
) {
  if (!previous?.mpPreapprovalId) return;
  if (newPreapprovalId && previous.mpPreapprovalId === newPreapprovalId) return;
  const isActiveOrPaused =
    previous.autoRenew === true ||
    previous.subscriptionStatus === 'ACTIVE' ||
    previous.subscriptionStatus === 'PAUSED';
  if (!isActiveOrPaused) return;

  try {
    await cancelMercadoPagoPreapproval(previous.mpPreapprovalId);
  } catch (cancelErr) {
    console.warn('[Cancel Previous Preapproval Error]:', cancelErr);
  }
}

async function confirmCatalogPayment(
  paymentRecordId: string,
  feeOverride?: { feeCents?: number; netAmountCents?: number }
) {
  const txResult = await confirmCatalogPaymentTx({
    paymentRecordId,
    resolveConfirmation: (paymentRecord) => {
      const fallback = calculatePixFeeFallback(paymentRecord.amountCents);
      const feeCents = feeOverride?.feeCents ?? fallback.feeCents;
      const netAmountCents =
        feeOverride?.netAmountCents ??
        Math.max(0, paymentRecord.amountCents - feeCents);

      const nowMs = Date.now();
      const planDef = resolvePlanDefinition(paymentRecord.planCode);
      const nextPlanType = resolveNextPlanType(
        paymentRecord.catalog,
        planDef.planType,
        nowMs
      );

      return {
        feeCents,
        netAmountCents,
        planMonths: planDef.months,
        nextPlanType,
        nowMs,
      };
    },
  });

  if (!txResult) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  // Cancela assinatura anterior ativa para evitar cobrança dupla ao migrar para Pix avulso
  if (txResult.justConfirmed) {
    await cancelPreviousPreapprovalIfActive(txResult.previousPreapproval);
  }

  // Dispara e-mail em background apenas na transição efetiva de PENDING -> PAID
  if (txResult.justConfirmed && txResult.catalog.expiresAt) {
    if (txResult.type === 'CREATION') {
      void sendCatalogPublishedEmail({
        to: txResult.user.email,
        name: txResult.user.name,
        storeName: txResult.catalog.storeName,
        slug: txResult.catalog.slug,
        editToken: txResult.catalog.editToken,
        expiresAt: txResult.catalog.expiresAt,
      }).catch((mailErr) => {
        console.error('[Catalog Published Email Error]:', mailErr);
      });
    } else if (txResult.type === 'RENEWAL') {
      void sendCatalogRenewedEmail({
        to: txResult.user.email,
        name: txResult.user.name,
        storeName: txResult.catalog.storeName,
        slug: txResult.catalog.slug,
        editToken: txResult.catalog.editToken,
        expiresAt: txResult.catalog.expiresAt,
      }).catch((mailErr) => {
        console.error('[Catalog Renewed Email Error]:', mailErr);
      });
    }
  }

  return txResult.catalog;
}

export interface CreateCatalogServiceInput {
  userId: string;
  userEmail: string;
  meta: z.infer<typeof catalogMetadataSchema>;
  validatedProducts: Array<z.infer<typeof productInputSchema>>;
  planCode?: unknown;
  files: Express.Multer.File[];
}

export async function createCatalog(input: CreateCatalogServiceInput) {
  const { userId, userEmail, meta, validatedProducts, planCode, files } = input;

  const fileByField = new Map<string, Express.Multer.File>();
  for (const file of files) {
    assertValidImageMagicBytes(file.buffer, file.mimetype);
    fileByField.set(file.fieldname, file);
  }

  const uploadedUrls: string[] = [];
  try {
    const logoFile = fileByField.get('logo');
    let logoUrl: string | null = null;
    if (logoFile?.buffer) {
      logoUrl = await uploadImageToR2(logoFile.buffer);
      uploadedUrls.push(logoUrl);
    }

    const productsData = await Promise.all(
      validatedProducts.map(async (p, index) => {
        const uploadedFile = p.imageField
          ? fileByField.get(p.imageField)
          : undefined;

        let imageUrl: string | null = null;
        if (uploadedFile?.buffer) {
          imageUrl = await uploadImageToR2(uploadedFile.buffer);
          uploadedUrls.push(imageUrl);
        }

        return {
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          imageUrl,
          orderIndex: p.orderIndex ?? index,
          available: parseBoolean(p.available, true),
        };
      })
    );

    const slug = await generateUniqueSlug(meta.storeName);
    const planDef = resolvePlanDefinition(planCode);
    const amountCents = planDef.amountCents;

    const { dbUser, existingTrialByWhatsapp } = await findTrialEligibilityData(
      userId,
      meta.whatsapp
    );

    const isEligibleForTrial = Boolean(
      dbUser && !dbUser.hasUsedTrial && !existingTrialByWhatsapp
    );

    if (isEligibleForTrial) {
      const trialCatalog = await createTrialCatalogTx({
        slug,
        expiresAt: new Date(Date.now() + FIFTEEN_DAYS_MS),
        userId,
        storeName: meta.storeName,
        logoUrl,
        themeColor: meta.themeColor,
        whatsapp: meta.whatsapp,
        pixKey: meta.pixKey,
        depositPct: meta.depositPct,
        minOrderCents: meta.minOrderCents,
        paymentNotice: meta.paymentNotice,
        deliveryDates: meta.deliveryDates.filter(Boolean),
        notes: meta.notes,
        products: productsData,
      });

      if (trialCatalog) {
        markMerchantCache(userId);
        return {
          catalogId: trialCatalog.id,
          slug: trialCatalog.slug,
          editToken: trialCatalog.editToken,
          activatedByTrial: true as const,
          expiresAt: trialCatalog.expiresAt,
        };
      }
    }

    const catalog = await createDraftCatalog({
      slug,
      planType: planDef.planType,
      userId,
      storeName: meta.storeName,
      logoUrl,
      themeColor: meta.themeColor,
      whatsapp: meta.whatsapp,
      pixKey: meta.pixKey,
      depositPct: meta.depositPct,
      minOrderCents: meta.minOrderCents,
      paymentNotice: meta.paymentNotice,
      deliveryDates: meta.deliveryDates.filter(Boolean),
      notes: meta.notes,
      products: productsData,
    });

    markMerchantCache(userId);

    const payment = await createPixPayment({
      catalogId: catalog.id,
      storeName: catalog.storeName,
      amountCents,
      description: planDef.label,
      payerEmail: userEmail,
    });

    const paymentRecord = await createCatalogPaymentRecord({
      userId,
      catalogId: catalog.id,
      type: 'CREATION',
      planCode: planDef.code,
      amountCents,
      gatewayId: payment.paymentId,
    });

    await updateOwnedCatalogPaymentId(catalog.id, userId, payment.paymentId);

    return {
      catalogId: catalog.id,
      paymentRecordId: paymentRecord.id,
      slug: catalog.slug,
      editToken: catalog.editToken,
      qrCodeBase64: payment.qrCodeBase64,
      pixCopyPaste: payment.pixCopyPaste,
      mockMode: payment.mockMode,
      activatedByTrial: false as const,
    };
  } catch (innerErr) {
    if (uploadedUrls.length > 0) {
      void deleteImagesFromR2(uploadedUrls);
    }
    throw innerErr;
  }
}

export async function renewCatalog(params: {
  catalogId: string;
  userId: string;
  userEmail: string;
  planCode?: unknown;
}) {
  const { catalogId, userId, userEmail, planCode } = params;

  const catalog = await findOwnedCatalogById(catalogId, userId);
  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const planDef = resolvePlanDefinition(planCode);
  const amountCents = planDef.amountCents;
  const paymentType =
    catalog.status === 'DRAFT' &&
    catalog.renewalCount === 0 &&
    !catalog.expiresAt
      ? 'CREATION'
      : 'RENEWAL';

  const payment = await createPixPayment({
    catalogId: catalog.id,
    storeName: catalog.storeName,
    amountCents,
    description: planDef.label,
    payerEmail: userEmail,
    idempotencyKey: `vitrimini-renew-${catalog.id}-${Date.now()}`,
  });

  const paymentRecord = await createCatalogPaymentRecord({
    userId,
    catalogId: catalog.id,
    type: paymentType,
    planCode: planDef.code,
    amountCents,
    gatewayId: payment.paymentId,
  });

  await updateOwnedCatalogPaymentId(catalog.id, userId, payment.paymentId);

  return {
    catalogId: catalog.id,
    paymentRecordId: paymentRecord.id,
    slug: catalog.slug,
    editToken: catalog.editToken,
    qrCodeBase64: payment.qrCodeBase64,
    pixCopyPaste: payment.pixCopyPaste,
    mockMode: payment.mockMode,
  };
}

export async function createCardSubscriptionForCatalog(
  catalogId: string,
  userId: string,
  body: { planCode: PlanCode | LegacyPlanCode; autoRenewConsent: true }
) {
  const catalog = await findOwnedCatalogById(catalogId, userId);
  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const dbUser = await findUserEmailById(userId);
  if (!dbUser) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const planDef = resolvePlanDefinition(body.planCode);
  const paymentType =
    catalog.status === 'DRAFT' &&
    catalog.renewalCount === 0 &&
    !catalog.expiresAt
      ? 'CREATION'
      : 'RENEWAL';

  const frontendBaseUrl =
    (process.env.FRONTEND_URL || '')
      .split(',')[0]
      ?.trim()
      .replace(/\/+$/, '') ||
    (process.env.NODE_ENV === 'production'
      ? 'https://vitrimini.com.br'
      : 'http://localhost:5173');
  const backUrl = `${frontendBaseUrl}/painel/${catalog.id}?subscription=return`;

  const subscription = await createCardSubscription({
    catalogId: catalog.id,
    storeName: catalog.storeName,
    planCode: planDef.code,
    payerEmail: dbUser.email,
    backUrl,
    externalReference: catalog.id,
  });

  const paymentRecord = await createCatalogPaymentRecord({
    userId,
    catalogId: catalog.id,
    type: paymentType,
    planCode: planDef.code,
    amountCents: planDef.amountCents,
    gatewayId: subscription.preapprovalId,
    autoRenewConsentAt: new Date(),
    autoRenewConsentVersion: '2.2',
  });

  const hasActiveSubscription =
    Boolean(catalog.mpPreapprovalId) &&
    (catalog.autoRenew ||
      catalog.subscriptionStatus === 'ACTIVE' ||
      catalog.subscriptionStatus === 'PAUSED');

  if (!hasActiveSubscription) {
    await savePendingPreapprovalOnCatalog(
      catalog.id,
      userId,
      subscription.preapprovalId
    );
  }

  return {
    initPoint: subscription.initPoint,
    preapprovalId: subscription.preapprovalId,
    paymentRecordId: paymentRecord.id,
  };
}

export async function cancelCatalogSubscription(
  catalogId: string,
  userId: string
) {
  const catalog = await findOwnedCatalogById(catalogId, userId);
  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  if (!catalog.mpPreapprovalId) {
    throw new AppError(
      400,
      'Esta vitrine não possui uma assinatura recorrente vinculada.'
    );
  }

  await cancelMercadoPagoPreapproval(catalog.mpPreapprovalId);

  const canceledAt = new Date();
  const updated = await cancelOwnedCatalogSubscriptionDb(
    catalog.id,
    userId,
    canceledAt
  );

  return {
    subscriptionStatus: updated.subscriptionStatus ?? 'CANCELLED',
    autoRenew: updated.autoRenew,
    canceledAt: updated.canceledAt,
    expiresAt: updated.expiresAt,
  };
}

export async function syncCatalogSubscriptionForOwner(
  catalogId: string,
  userId: string,
  preapprovalIdHint?: string
) {
  const catalog = await findOwnedCatalogById(catalogId, userId);
  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const targetPreapprovalId =
    preapprovalIdHint?.trim() || catalog.mpPreapprovalId || undefined;

  if (targetPreapprovalId && !isMockPixEnabled()) {
    const preapproval = await fetchMercadoPagoPreapproval(targetPreapprovalId);
    const refOk =
      !preapproval?.external_reference ||
      preapproval.external_reference.trim() === catalog.id ||
      catalog.mpPreapprovalId === targetPreapprovalId;

    if (preapproval && refOk) {
      const mpStatus = preapproval.status?.toLowerCase();
      if (mpStatus === 'authorized') {
        const authPayments =
          await searchMercadoPagoAuthorizedPaymentsByPreapproval(
            targetPreapprovalId
          );
        const paidMatch = authPayments.find((item) => {
          const st = (item.payment?.status || item.status || '').toLowerCase();
          return st === 'processed' || st === 'approved';
        });

        const canonicalPaymentId = paidMatch?.payment?.id
          ? String(paidMatch.payment.id)
          : paidMatch?.id
            ? String(paidMatch.id)
            : targetPreapprovalId;

        const pendingPreapprovalRecord =
          await findCatalogPaymentByGatewayId(targetPreapprovalId);

        const needsSync =
          catalog.subscriptionStatus !== 'ACTIVE' ||
          !catalog.autoRenew ||
          catalog.mpPreapprovalId !== targetPreapprovalId ||
          pendingPreapprovalRecord?.status === 'PENDING';

        if (needsSync) {
          await confirmSubscriptionCharge({
            catalog: {
              id: catalog.id,
              planType: catalog.planType,
            },
            canonicalPaymentId,
            preapprovalId: targetPreapprovalId,
            preapproval,
            transactionAmount:
              paidMatch?.transaction_amount ??
              preapproval.auto_recurring?.transaction_amount,
            netReceivedAmount: paidMatch?.net_received_amount,
          });
        }
      } else if (
        mpStatus === 'cancelled' &&
        catalog.mpPreapprovalId === targetPreapprovalId &&
        catalog.subscriptionStatus !== 'CANCELLED'
      ) {
        await updateCatalogSubscriptionFieldsForWebhook({
          catalogId: catalog.id,
          userId: catalog.userId,
          data: {
            subscriptionStatus: 'CANCELLED',
            autoRenew: false,
            canceledAt: catalog.canceledAt ?? new Date(),
          },
        });
      }
    }
  }

  const fresh = await findOwnedCatalogDetail({ id: catalogId, userId });
  if (!fresh) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  return {
    status: fresh.status,
    isTrial: fresh.isTrial,
    expiresAt: fresh.expiresAt,
    planType: fresh.planType,
    billingType: fresh.billingType,
    mpPreapprovalId: fresh.mpPreapprovalId,
    subscriptionStatus: fresh.subscriptionStatus,
    autoRenew: fresh.autoRenew,
    canceledAt: fresh.canceledAt,
    nextBillingAt: fresh.nextBillingAt,
    hasProAccess: hasProFeatures(fresh),
  };
}

export async function getMyCatalogs(userId: string) {
  void cleanupExpiredCatalogs();

  const nowMs = Date.now();
  const { catalogs, dbUser } = await findUserCatalogsAndTrialFlag(userId);

  const enriched = catalogs.map((cat) => {
    const expiresMs = cat.expiresAt ? cat.expiresAt.getTime() : null;
    const isExpired =
      cat.status === 'EXPIRED' || (expiresMs !== null && expiresMs < nowMs);

    let daysLeft: number | null = null;
    if (!isExpired && expiresMs !== null) {
      daysLeft = Math.max(1, Math.ceil((expiresMs - nowMs) / DAY_MS));
    }

    let daysLeftToDelete: number | null = null;
    if (isExpired && expiresMs !== null) {
      const deleteDeadlineMs = expiresMs + GRACE_PERIOD_MS;
      daysLeftToDelete = Math.max(
        1,
        Math.ceil((deleteDeadlineMs - nowMs) / DAY_MS)
      );
    }

    const { mpUserId: catMpUserId, ...safeCat } = cat;
    return {
      ...safeCat,
      status: isExpired ? ('EXPIRED' as const) : cat.status,
      isExpired,
      daysLeft,
      daysLeftToDelete,
      mpConnected: Boolean(catMpUserId),
      hasProAccess: hasProFeatures(cat),
    };
  });

  return {
    catalogs: enriched,
    canUseTrial: !dbUser?.hasUsedTrial,
  };
}

export async function getCatalogStatus(params: {
  catalogId: string;
  userId: string;
  paymentRecordId?: string;
}) {
  const { catalogId, userId, paymentRecordId } = params;

  const catalog = await findOwnedCatalogStatusSummary(catalogId, userId);
  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const targetPayment = await findOwnedCatalogPaymentForStatus({
    catalogId: catalog.id,
    userId,
    paymentRecordId,
  });

  if (
    targetPayment &&
    targetPayment.status === 'PENDING' &&
    targetPayment.gatewayId &&
    !isMockPixEnabled()
  ) {
    try {
      const verification = await verifyMercadoPagoOrder(
        targetPayment.gatewayId,
        targetPayment.amountCents
      );
      if (
        verification.approved &&
        typeof verification.paidCents === 'number' &&
        verification.paidCents >= targetPayment.amountCents &&
        (!verification.catalogId ||
          verification.catalogId === targetPayment.catalogId)
      ) {
        const updatedCatalog = await confirmCatalogPayment(targetPayment.id, {
          feeCents: verification.feeCents,
          netAmountCents: verification.netAmountCents,
        });
        return {
          status: updatedCatalog.status,
          slug: updatedCatalog.slug,
          editToken: updatedCatalog.editToken,
          expiresAt: updatedCatalog.expiresAt,
          renewalCount: updatedCatalog.renewalCount,
          paymentPaid: true,
        };
      }
    } catch (verifyErr) {
      console.error('[Polling Fallback Verify Error]:', verifyErr);
    }
  }

  return {
    status: catalog.status,
    slug: catalog.slug,
    editToken: catalog.editToken,
    expiresAt: catalog.expiresAt,
    renewalCount: catalog.renewalCount,
    paymentPaid: targetPayment
      ? targetPayment.status === 'PAID'
      : catalog.status === 'ACTIVE',
  };
}

export async function mockPayCatalog(params: {
  catalogId: string;
  userId: string;
  planCode?: unknown;
}) {
  if (!isMockPixEnabled()) {
    throw new AppError(403, 'Pagamento simulado indisponível neste ambiente.');
  }

  const { catalogId, userId, planCode } = params;
  const existing = await findOwnedCatalogById(catalogId, userId);

  if (!existing) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const pendingPayment = await findPendingOwnedCatalogPayment(
    existing.id,
    userId
  );

  if (pendingPayment) {
    const updated = await confirmCatalogPayment(pendingPayment.id);
    return {
      status: updated.status,
      slug: updated.slug,
      editToken: updated.editToken,
      expiresAt: updated.expiresAt,
      renewalCount: updated.renewalCount,
      paymentPaid: true,
    };
  }

  const planDef = resolvePlanDefinition(planCode);
  const now = Date.now();
  const baseTime =
    existing.expiresAt && existing.expiresAt.getTime() > now
      ? existing.expiresAt.getTime()
      : now;
  const expiresAt = addCalendarMonths(new Date(baseTime), planDef.months);

  const updated = await activateOwnedCatalogMockDirect({
    id: existing.id,
    userId,
    planType: resolveNextPlanType(existing, planDef.planType, now),
    expiresAt,
  });

  return { ...updated, paymentPaid: true };
}

function resolvePlanFromSubscriptionWebhook(params: {
  pendingPlanCode?: string | null;
  transactionAmount?: number;
  frequency?: number;
  fallbackPlanType: 'ESSENTIAL' | 'PRO';
}) {
  if (
    params.pendingPlanCode &&
    (params.pendingPlanCode in PLAN_CATALOG ||
      params.pendingPlanCode in LEGACY_PLAN_MAP)
  ) {
    return resolvePlanDefinition(params.pendingPlanCode);
  }

  if (
    typeof params.transactionAmount === 'number' &&
    Number.isFinite(params.transactionAmount)
  ) {
    const cents = Math.round(params.transactionAmount * 100);
    const matched = Object.values(PLAN_CATALOG).find(
      (p) => p.amountCents === cents
    );
    if (matched) return matched;
  }

  if (typeof params.frequency === 'number' && params.frequency >= 12) {
    return PLAN_CATALOG.PRO_365;
  }

  return params.fallbackPlanType === 'PRO'
    ? PLAN_CATALOG.PRO_30
    : PLAN_CATALOG.ESSENTIAL_30;
}

async function handleSubscriptionPreapprovalWebhook(preapprovalId: string) {
  const preapproval = await fetchMercadoPagoPreapproval(preapprovalId);
  if (!preapproval) return;

  const parsedRefUuid = preapproval.external_reference
    ? z.string().uuid().safeParse(preapproval.external_reference.trim())
    : null;
  const catalog = await findCatalogByPreapprovalOrRefForWebhook(
    preapprovalId,
    parsedRefUuid?.success ? parsedRefUuid.data : undefined
  );
  if (!catalog) return;

  const status = preapproval.status?.toLowerCase();
  if (status === 'cancelled') {
    if (catalog.mpPreapprovalId && catalog.mpPreapprovalId !== preapprovalId) {
      return;
    }
    await updateCatalogSubscriptionFieldsForWebhook({
      catalogId: catalog.id,
      userId: catalog.userId,
      data: {
        subscriptionStatus: 'CANCELLED',
        autoRenew: false,
        canceledAt: catalog.canceledAt ?? new Date(),
      },
    });
    return;
  }

  if (status === 'paused') {
    if (catalog.mpPreapprovalId && catalog.mpPreapprovalId !== preapprovalId) {
      return;
    }
    await updateCatalogSubscriptionFieldsForWebhook({
      catalogId: catalog.id,
      userId: catalog.userId,
      data: {
        subscriptionStatus: 'PAUSED',
      },
    });
    return;
  }

  if (status === 'authorized') {
    await cancelPreviousPreapprovalIfActive(
      {
        mpPreapprovalId: catalog.mpPreapprovalId,
        autoRenew: catalog.autoRenew,
        subscriptionStatus: catalog.subscriptionStatus,
      },
      preapprovalId
    );

    const parsedNextBilling = preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date)
      : null;

    await updateCatalogSubscriptionFieldsForWebhook({
      catalogId: catalog.id,
      userId: catalog.userId,
      data: {
        subscriptionStatus: 'ACTIVE',
        billingType: 'CARD_RECURRING',
        mpPreapprovalId: preapprovalId,
        autoRenew: true,
        canceledAt: null,
        ...(parsedNextBilling && !Number.isNaN(parsedNextBilling.getTime())
          ? { nextBillingAt: parsedNextBilling }
          : {}),
      },
    });
  }
}

async function confirmSubscriptionCharge(params: {
  catalog: { id: string; planType: 'ESSENTIAL' | 'PRO' };
  canonicalPaymentId: string;
  preapprovalId?: string;
  preapproval?: Awaited<ReturnType<typeof fetchMercadoPagoPreapproval>>;
  transactionAmount?: number;
  netReceivedAmount?: number;
  feeCentsOverride?: number;
}) {
  const pendingPreapprovalRecord = params.preapprovalId
    ? await findCatalogPaymentByGatewayId(params.preapprovalId)
    : null;

  const planDef = resolvePlanFromSubscriptionWebhook({
    pendingPlanCode: pendingPreapprovalRecord?.planCode,
    transactionAmount:
      params.transactionAmount ??
      params.preapproval?.auto_recurring?.transaction_amount,
    frequency: params.preapproval?.auto_recurring?.frequency,
    fallbackPlanType: params.catalog.planType,
  });

  const amountCents =
    typeof params.transactionAmount === 'number' &&
    Number.isFinite(params.transactionAmount) &&
    params.transactionAmount > 0
      ? Math.round(params.transactionAmount * 100)
      : planDef.amountCents;

  let netAmountCents: number;
  let feeCents: number;
  if (
    typeof params.netReceivedAmount === 'number' &&
    Number.isFinite(params.netReceivedAmount) &&
    params.netReceivedAmount >= 0
  ) {
    netAmountCents = Math.min(
      amountCents,
      Math.round(params.netReceivedAmount * 100)
    );
    feeCents = Math.max(0, amountCents - netAmountCents);
  } else if (
    typeof params.feeCentsOverride === 'number' &&
    Number.isFinite(params.feeCentsOverride) &&
    params.feeCentsOverride >= 0
  ) {
    feeCents = Math.min(amountCents, params.feeCentsOverride);
    netAmountCents = Math.max(0, amountCents - feeCents);
  } else {
    netAmountCents = amountCents;
    feeCents = 0;
  }

  const parsedNextBilling = params.preapproval?.next_payment_date
    ? new Date(params.preapproval.next_payment_date)
    : null;
  const nextBillingAt =
    parsedNextBilling && !Number.isNaN(parsedNextBilling.getTime())
      ? parsedNextBilling
      : undefined;

  const nowMs = Date.now();
  try {
    const result = await confirmAuthorizedSubscriptionPaymentTx({
      catalogId: params.catalog.id,
      authorizedPaymentId: params.canonicalPaymentId,
      preapprovalId: params.preapprovalId,
      planCode: planDef.code,
      planMonths: planDef.months,
      resolveNextPlanType: (current) =>
        resolveNextPlanType(current, planDef.planType, nowMs),
      amountCents,
      feeCents,
      netAmountCents,
      nextBillingAt,
      nowMs,
    });

    if (!result) return;

    await cancelPreviousPreapprovalIfActive(
      result.previousPreapproval,
      params.preapprovalId
    );

    if (result.catalog.expiresAt) {
      if (result.paymentType === 'CREATION') {
        void sendCatalogPublishedEmail({
          to: result.user.email,
          name: result.user.name,
          storeName: result.catalog.storeName,
          slug: result.catalog.slug,
          editToken: result.catalog.editToken,
          expiresAt: result.catalog.expiresAt,
        }).catch((mailErr) => {
          console.error('[Catalog Published Email Error]:', mailErr);
        });
      } else {
        void sendCatalogRenewedEmail({
          to: result.user.email,
          name: result.user.name,
          storeName: result.catalog.storeName,
          slug: result.catalog.slug,
          editToken: result.catalog.editToken,
          expiresAt: result.catalog.expiresAt,
        }).catch((mailErr) => {
          console.error('[Catalog Renewed Email Error]:', mailErr);
        });
      }
    }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return;
    }
    throw err;
  }
}

async function handleSubscriptionAuthorizedPaymentWebhook(
  authorizedPaymentId: string
) {
  const authPayment =
    await fetchMercadoPagoAuthorizedPayment(authorizedPaymentId);
  if (!authPayment) return;

  const rawStatus = (
    authPayment.payment?.status ||
    authPayment.status ||
    ''
  ).toLowerCase();
  if (rawStatus !== 'processed' && rawStatus !== 'approved') {
    return;
  }

  const preapprovalId = authPayment.preapproval_id
    ? String(authPayment.preapproval_id)
    : undefined;
  const preapproval = preapprovalId
    ? await fetchMercadoPagoPreapproval(preapprovalId)
    : null;

  const rawExternalRef =
    authPayment.external_reference ?? preapproval?.external_reference;
  const parsedRefUuid = rawExternalRef
    ? z.string().uuid().safeParse(rawExternalRef.trim())
    : null;

  const catalog = await findCatalogByPreapprovalOrRefForWebhook(
    preapprovalId,
    parsedRefUuid?.success ? parsedRefUuid.data : undefined
  );
  if (!catalog) return;

  const canonicalPaymentId = authPayment.payment?.id
    ? String(authPayment.payment.id)
    : String(authorizedPaymentId);

  await confirmSubscriptionCharge({
    catalog,
    canonicalPaymentId,
    preapprovalId,
    preapproval,
    transactionAmount: authPayment.transaction_amount,
    netReceivedAmount: authPayment.net_received_amount,
  });
}

async function handleMercadoPagoPaymentWebhookForSubscription(
  paymentId: string
): Promise<boolean> {
  const mpPayment = await fetchMercadoPagoPayment(paymentId);
  if (!mpPayment) return false;

  if (mpPayment.status?.toLowerCase() !== 'approved') {
    return false;
  }

  const preapprovalIdRaw =
    mpPayment.preapproval_id ??
    mpPayment.metadata?.preapproval_id ??
    mpPayment.point_of_interaction?.transaction_data?.subscription_id;
  const preapprovalId =
    typeof preapprovalIdRaw === 'string' && preapprovalIdRaw.trim()
      ? preapprovalIdRaw.trim()
      : undefined;

  const parsedRefUuid = mpPayment.external_reference
    ? z.string().uuid().safeParse(mpPayment.external_reference.trim())
    : null;

  const catalog = await findCatalogByPreapprovalOrRefForWebhook(
    preapprovalId,
    parsedRefUuid?.success ? parsedRefUuid.data : undefined
  );
  if (!catalog) return false;

  const isSubscriptionCatalog =
    Boolean(preapprovalId) ||
    catalog.billingType === 'CARD_RECURRING' ||
    Boolean(catalog.mpPreapprovalId);
  if (!isSubscriptionCatalog) return false;

  const resolvedPreapprovalId =
    preapprovalId ?? catalog.mpPreapprovalId ?? undefined;
  const preapproval = resolvedPreapprovalId
    ? await fetchMercadoPagoPreapproval(resolvedPreapprovalId)
    : null;

  const sumCollectorFee = Array.isArray(mpPayment.fee_details)
    ? mpPayment.fee_details
        .filter((f) => !f.fee_payer || f.fee_payer === 'collector')
        .reduce(
          (acc, f) => acc + (typeof f.amount === 'number' ? f.amount : 0),
          0
        )
    : undefined;

  await confirmSubscriptionCharge({
    catalog,
    canonicalPaymentId: String(mpPayment.id ?? paymentId),
    preapprovalId: resolvedPreapprovalId,
    preapproval,
    transactionAmount: mpPayment.transaction_amount,
    netReceivedAmount: mpPayment.transaction_details?.net_received_amount,
    feeCentsOverride:
      typeof sumCollectorFee === 'number'
        ? Math.max(0, Math.round(sumCollectorFee * 100))
        : undefined,
  });

  return true;
}

export async function processPixWebhook(params: {
  body: Record<string, unknown>;
  queryDataId?: string;
  xSignature?: string;
  xRequestId?: string;
}) {
  const { body, queryDataId, xSignature, xRequestId } = params;
  const rawBodyData =
    typeof body.data === 'object' && body.data !== null
      ? (body.data as Record<string, unknown>)
      : undefined;
  const bodyDataId = rawBodyData?.id ? String(rawBodyData.id) : undefined;
  const mpOrderId = queryDataId || bodyDataId;
  const eventType =
    typeof body.type === 'string'
      ? body.type
      : typeof body.topic === 'string'
        ? body.topic
        : undefined;

  if (!isMockPixEnabled()) {
    if (!mpOrderId) {
      throw new AppError(401, 'Assinatura de webhook ausente.');
    }

    const isSignatureValid = validateMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId: mpOrderId,
    });

    if (!isSignatureValid) {
      throw new AppError(401, 'Assinatura de webhook inválida.');
    }

    if (eventType === 'subscription_preapproval') {
      await handleSubscriptionPreapprovalWebhook(mpOrderId);
      return { received: true };
    }

    if (eventType === 'subscription_authorized_payment') {
      await handleSubscriptionAuthorizedPaymentWebhook(mpOrderId);
      return { received: true };
    }

    const paymentRecord = await findCatalogPaymentByGatewayId(mpOrderId);

    if (paymentRecord) {
      const verification = await verifyMercadoPagoOrder(
        mpOrderId,
        paymentRecord.amountCents
      );
      if (
        verification.approved &&
        typeof verification.paidCents === 'number' &&
        verification.paidCents >= paymentRecord.amountCents &&
        (!verification.catalogId ||
          verification.catalogId === paymentRecord.catalogId)
      ) {
        await confirmCatalogPayment(paymentRecord.id, {
          feeCents: verification.feeCents,
          netAmountCents: verification.netAmountCents,
        });
      }
    } else {
      if (eventType === 'payment') {
        const handledAsSubscription =
          await handleMercadoPagoPaymentWebhookForSubscription(mpOrderId);
        if (handledAsSubscription) {
          return { received: true };
        }
      }

      const verification = await verifyMercadoPagoOrder(mpOrderId);
      const parsedVerifiedUuid = verification.catalogId
        ? z.string().uuid().safeParse(verification.catalogId.trim())
        : null;

      if (verification.approved && parsedVerifiedUuid?.success) {
        const verifiedCatalogId = parsedVerifiedUuid.data;
        const fallbackRecord = await findFallbackPendingPaymentForWebhook(
          verifiedCatalogId,
          mpOrderId
        );
        if (
          fallbackRecord &&
          typeof verification.paidCents === 'number' &&
          verification.paidCents >= fallbackRecord.amountCents &&
          verifiedCatalogId === fallbackRecord.catalogId
        ) {
          await confirmCatalogPayment(fallbackRecord.id, {
            feeCents: verification.feeCents,
            netAmountCents: verification.netAmountCents,
          });
        }
      }
    }

    return { received: true };
  }

  // Ramo MOCK_PIX
  const rawTargetCatalogId =
    body.catalogId ?? rawBodyData?.external_reference;
  const initialUuidParse =
    typeof rawTargetCatalogId === 'string'
      ? z.string().uuid().safeParse(rawTargetCatalogId.trim())
      : null;

  let targetCatalogId: string | undefined = initialUuidParse?.success
    ? initialUuidParse.data
    : undefined;

  const targetGatewayId: string | undefined =
    typeof body.paymentId === 'string' && body.paymentId.trim()
      ? body.paymentId.trim()
      : mpOrderId;

  let approved =
    body.status === 'approved' ||
    body.action === 'order.processed' ||
    rawBodyData?.status === 'processed';

  let approvedFeeOverride:
    | { feeCents?: number; netAmountCents?: number }
    | undefined;

  const paymentRecord = targetGatewayId
    ? await findCatalogPaymentByGatewayId(targetGatewayId)
    : targetCatalogId
      ? await findPendingPaymentByCatalogIdForWebhook(targetCatalogId)
      : null;

  if (mpOrderId) {
    const verification = await verifyMercadoPagoOrder(
      mpOrderId,
      paymentRecord?.amountCents
    );
    approved = verification.approved;
    if (verification.catalogId) {
      const verifiedUuidParse = z
        .string()
        .uuid()
        .safeParse(verification.catalogId.trim());
      targetCatalogId = verifiedUuidParse.success
        ? verifiedUuidParse.data
        : undefined;
    }
    approvedFeeOverride = {
      feeCents: verification.feeCents,
      netAmountCents: verification.netAmountCents,
    };
  }

  if (approved && paymentRecord) {
    await confirmCatalogPayment(paymentRecord.id, approvedFeeOverride);
  } else if (approved && targetCatalogId) {
    const validCatalogUuid = z.string().uuid().safeParse(targetCatalogId);
    if (validCatalogUuid.success) {
      const catalog = await findCatalogByIdForWebhook(validCatalogUuid.data);
      if (catalog && catalog.status !== 'ACTIVE') {
        await activateCatalogFromMockWebhook(
          catalog.id,
          catalog.userId,
          addCalendarMonths(new Date(), 1)
        );
      }
    }
  }

  return { received: true };
}

export async function getPublicStoreBySlug(params: {
  rawSlug: string;
  isPreview: boolean;
  requesterId: string | null;
}) {
  const slug = params.rawSlug.trim().toLowerCase();
  if (!slug || slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const catalog = await findPublicCatalogBySlug(slug);
  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const isAuthorizedPreview =
    params.isPreview &&
    Boolean(params.requesterId) &&
    params.requesterId === catalog.userId;

  if (!isAuthorizedPreview) {
    if (
      catalog.status === 'EXPIRED' ||
      (catalog.expiresAt && catalog.expiresAt < new Date())
    ) {
      if (catalog.status !== 'EXPIRED') {
        await markOwnedCatalogExpired(catalog.id, catalog.userId);
      }
      throw new AppError(
        410,
        'Esta vitrine encerrou o período de encomendas.'
      );
    }

    if (catalog.status !== 'ACTIVE') {
      throw new AppError(403, 'Esta vitrine ainda não está ativa.');
    }
  }

  return {
    id: catalog.id,
    slug: catalog.slug,
    status: catalog.status,
    storeName: catalog.storeName,
    logoUrl: catalog.logoUrl,
    themeColor: catalog.themeColor,
    storeAppearance: extractStoreAppearance(catalog.bioLinksConfig),
    whatsapp: catalog.whatsapp,
    pixKey: catalog.pixKey,
    depositPct: catalog.depositPct,
    minOrderCents: catalog.minOrderCents,
    paymentNotice: catalog.paymentNotice,
    deliveryDates: catalog.deliveryDates,
    notes: catalog.notes,
    expiresAt: catalog.expiresAt,
    onlinePaymentAvailable:
      hasProFeatures(catalog) &&
      catalog.onlinePaymentEnabled &&
      Boolean(catalog.mpAccessToken),
    bioLinksConfig:
      hasProFeatures(catalog) &&
      (catalog.bioLinksConfig as { enabled?: boolean } | null)?.enabled === true
        ? catalog.bioLinksConfig
        : null,
    products: catalog.products,
  };
}

export async function resolveCatalogEditToken(params: {
  editToken: string;
  userId: string;
}) {
  const catalog = await findOwnedCatalogIdByEditToken(
    params.editToken,
    params.userId
  );

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  return { catalogId: catalog.id };
}

export async function getOwnedCatalogDetail(
  lookup: { id: string; userId: string } | { editToken: string; userId: string }
) {
  const catalog = await findOwnedCatalogDetail(lookup);

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const { mpUserId: catMpUserId, ...safeCatalog } = catalog;
  return {
    ...safeCatalog,
    storeAppearance: extractStoreAppearance(catalog.bioLinksConfig),
    mpConnected: Boolean(catMpUserId),
    hasProAccess: hasProFeatures(catalog),
  };
}

export interface ValidatedCatalogUpdatePayload {
  storeName?: string;
  whatsapp?: string;
  depositPct?: number;
  minOrderCents?: number;
  themeColor?: CatalogThemeColor;
  deliveryDates?: string[];
  pixKey?: string | null;
  paymentNotice?: string | null;
  notes?: string | null;
  pickupAddress?: string | null;
  pickupInstructions?: string | null;
  deliveryEstimate?: string | null;
  rawNotifyOrderByEmail?: unknown;
  incomingProducts?: Array<z.infer<typeof productInputSchema>>;
  bioLinksConfig?: z.infer<typeof bioLinksConfigSchema>;
  storeAppearance?: z.infer<typeof storeAppearanceSchema>;
  removeLogo: boolean;
}

type ExistingBioLinksConfig = {
  enabled?: boolean;
  bannerUrl?: string | null;
  links?: Array<{ id?: string; imageUrl?: string | null }>;
  storeAppearance?: z.infer<typeof storeAppearanceSchema>;
  [key: string]: unknown;
} | null;

export async function updateOwnedCatalog(params: {
  lookup: { id: string; userId: string } | { editToken: string; userId: string };
  userId: string;
  payload: ValidatedCatalogUpdatePayload;
  files: Express.Multer.File[];
}) {
  const { lookup, userId, payload, files } = params;

  const existing = await findOwnedCatalogWithProducts(lookup);
  if (!existing) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  const notifyOrderByEmail =
    payload.rawNotifyOrderByEmail !== undefined
      ? parseBoolean(payload.rawNotifyOrderByEmail, existing.notifyOrderByEmail)
      : existing.notifyOrderByEmail;

  const cleanStoreName = payload.storeName ?? existing.storeName;
  const cleanWhatsapp = payload.whatsapp ?? existing.whatsapp;
  const depositPct = payload.depositPct ?? existing.depositPct;
  const minOrderCents = payload.minOrderCents ?? existing.minOrderCents;
  const themeColor = payload.themeColor ?? existing.themeColor;
  const deliveryDates = payload.deliveryDates ?? existing.deliveryDates;
  const cleanPixKey =
    payload.pixKey !== undefined ? payload.pixKey : existing.pixKey;
  const cleanPaymentNotice =
    payload.paymentNotice !== undefined
      ? payload.paymentNotice
      : existing.paymentNotice;
  const cleanNotes =
    payload.notes !== undefined ? payload.notes : existing.notes;
  const cleanPickupAddress =
    payload.pickupAddress !== undefined
      ? payload.pickupAddress
      : existing.pickupAddress;
  const cleanPickupInstructions =
    payload.pickupInstructions !== undefined
      ? payload.pickupInstructions
      : existing.pickupInstructions;
  const cleanDeliveryEstimate =
    payload.deliveryEstimate !== undefined
      ? payload.deliveryEstimate
      : existing.deliveryEstimate;

  const existingBioConfig =
    existing.bioLinksConfig && typeof existing.bioLinksConfig === 'object'
      ? (existing.bioLinksConfig as ExistingBioLinksConfig)
      : null;

  const nextBioLinksConfig = payload.bioLinksConfig;
  if (nextBioLinksConfig) {
    if (nextBioLinksConfig.enabled && !hasProFeatures(existing)) {
      throw new AppError(
        403,
        'A publicação da Página de Links da Bio é exclusiva do Plano Pro.'
      );
    }
    if (payload.storeAppearance) {
      nextBioLinksConfig.storeAppearance =
        nextBioLinksConfig.storeAppearance ?? payload.storeAppearance;
    }
    if (!nextBioLinksConfig.storeAppearance && existingBioConfig?.storeAppearance) {
      nextBioLinksConfig.storeAppearance = existingBioConfig.storeAppearance;
    }
  }

  const bioLinksConfigToPersist: Prisma.InputJsonValue | undefined =
    nextBioLinksConfig
      ? (nextBioLinksConfig as Prisma.InputJsonValue)
      : payload.storeAppearance
        ? ((existingBioConfig
            ? {
                ...existingBioConfig,
                storeAppearance: payload.storeAppearance,
              }
            : {
                enabled: false,
                theme: 'minimal',
                buttonStyle: 'card',
                showFeaturedProducts: true,
                socials: {},
                links: [],
                storeAppearance: payload.storeAppearance,
              }) as Prisma.InputJsonValue)
        : undefined;

  // Todas as validações passaram — agora processamos uploads ao R2 e mapeamos fotos antigas para exclusão em lote
  const fileByField = new Map<string, Express.Multer.File>();
  for (const file of files) {
    assertValidImageMagicBytes(file.buffer, file.mimetype);
    fileByField.set(file.fieldname, file);
  }

  const logoFile = fileByField.get('logo');
  const newlyUploadedUrls: string[] = [];
  const oldUrlsToDelete: string[] = [];

  try {
    let nextLogoUrl = existing.logoUrl;
    if (logoFile?.buffer) {
      nextLogoUrl = await uploadImageToR2(logoFile.buffer);
      newlyUploadedUrls.push(nextLogoUrl);
      if (existing.logoUrl) {
        oldUrlsToDelete.push(existing.logoUrl);
      }
    } else if (payload.removeLogo) {
      nextLogoUrl = null;
      if (existing.logoUrl) {
        oldUrlsToDelete.push(existing.logoUrl);
      }
    }

    const allowedExistingImageUrls = new Set(
      existing.products
        .map((ep) => ep.imageUrl)
        .filter((url): url is string => typeof url === 'string' && url.length > 0)
    );

    const allowedExistingBioImageUrls = new Set<string>();
    if (
      typeof existingBioConfig?.bannerUrl === 'string' &&
      existingBioConfig.bannerUrl.length > 0
    ) {
      allowedExistingBioImageUrls.add(existingBioConfig.bannerUrl);
    }
    if (Array.isArray(existingBioConfig?.links)) {
      for (const item of existingBioConfig.links) {
        if (typeof item?.imageUrl === 'string' && item.imageUrl.length > 0) {
          allowedExistingBioImageUrls.add(item.imageUrl);
        }
      }
    }

    if (nextBioLinksConfig) {
      const bannerFile = fileByField.get('bioBanner');
      if (bannerFile?.buffer) {
        const uploadedBannerUrl = await uploadImageToR2(bannerFile.buffer);
        newlyUploadedUrls.push(uploadedBannerUrl);
        nextBioLinksConfig.bannerUrl = uploadedBannerUrl;
        if (
          typeof existingBioConfig?.bannerUrl === 'string' &&
          existingBioConfig.bannerUrl.length > 0
        ) {
          oldUrlsToDelete.push(existingBioConfig.bannerUrl);
        }
      } else if (!nextBioLinksConfig.bannerUrl) {
        nextBioLinksConfig.bannerUrl = undefined;
        if (
          typeof existingBioConfig?.bannerUrl === 'string' &&
          existingBioConfig.bannerUrl.length > 0
        ) {
          oldUrlsToDelete.push(existingBioConfig.bannerUrl);
        }
      } else if (!allowedExistingBioImageUrls.has(nextBioLinksConfig.bannerUrl)) {
        nextBioLinksConfig.bannerUrl = undefined;
      }

      const existingLinkImageById = new Map<string, string>();
      if (Array.isArray(existingBioConfig?.links)) {
        for (const oldLink of existingBioConfig.links) {
          if (
            typeof oldLink?.id === 'string' &&
            typeof oldLink?.imageUrl === 'string' &&
            oldLink.imageUrl.length > 0
          ) {
            existingLinkImageById.set(oldLink.id, oldLink.imageUrl);
          }
        }
      }

      for (const link of nextBioLinksConfig.links) {
        const linkImageFile = fileByField.get(`bioLinkImage_${link.id}`);
        const previousLinkImageUrl = existingLinkImageById.get(link.id);
        if (linkImageFile?.buffer) {
          const uploadedLinkImageUrl = await uploadImageToR2(
            linkImageFile.buffer
          );
          newlyUploadedUrls.push(uploadedLinkImageUrl);
          link.imageUrl = uploadedLinkImageUrl;
          if (previousLinkImageUrl) {
            oldUrlsToDelete.push(previousLinkImageUrl);
          }
        } else if (
          !link.imageUrl ||
          !allowedExistingBioImageUrls.has(link.imageUrl)
        ) {
          link.imageUrl = undefined;
        }
      }

      const finalBioImageUrls = new Set<string>();
      if (nextBioLinksConfig.bannerUrl) {
        finalBioImageUrls.add(nextBioLinksConfig.bannerUrl);
      }
      for (const link of nextBioLinksConfig.links) {
        if (link.imageUrl) {
          finalBioImageUrls.add(link.imageUrl);
        }
      }
      for (const oldUrl of allowedExistingBioImageUrls) {
        if (!finalBioImageUrls.has(oldUrl)) {
          oldUrlsToDelete.push(oldUrl);
        }
      }
    }

    const existingIds = new Set(existing.products.map((p) => p.id));

    const preparedProducts: PreparedProductPersistenceItem[] | undefined =
      payload.incomingProducts
        ? await Promise.all(
            payload.incomingProducts.map(async (p, index) => {
              const existingProduct = p.id
                ? existing.products.find((ep) => ep.id === p.id)
                : undefined;
              const uploadedFile = p.imageField
                ? fileByField.get(p.imageField)
                : undefined;

              let imageUrl: string | null = existingProduct?.imageUrl ?? null;
              if (p.imageUrl === null) {
                imageUrl = null;
              } else if (
                typeof p.imageUrl === 'string' &&
                allowedExistingImageUrls.has(p.imageUrl)
              ) {
                imageUrl = p.imageUrl;
              }

              if (uploadedFile?.buffer) {
                imageUrl = await uploadImageToR2(uploadedFile.buffer);
                newlyUploadedUrls.push(imageUrl);
                if (existingProduct?.imageUrl) {
                  oldUrlsToDelete.push(existingProduct.imageUrl);
                }
              } else if (
                existingProduct?.imageUrl &&
                imageUrl !== existingProduct.imageUrl
              ) {
                oldUrlsToDelete.push(existingProduct.imageUrl);
              }

              return {
                existingId:
                  p.id && existingIds.has(p.id) ? p.id : undefined,
                payload: {
                  name: p.name,
                  description: p.description,
                  priceCents: p.priceCents,
                  imageUrl,
                  orderIndex: p.orderIndex ?? index,
                  available: parseBoolean(p.available, true),
                },
              };
            })
          )
        : undefined;

    let toDeleteProductIds: string[] = [];
    if (preparedProducts) {
      const keptIds = new Set(
        preparedProducts
          .map((p) => p.existingId)
          .filter((id): id is string => Boolean(id))
      );

      const deletedProducts = existing.products.filter(
        (p) => !keptIds.has(p.id)
      );
      toDeleteProductIds = deletedProducts.map((p) => p.id);

      for (const delProd of deletedProducts) {
        if (delProd.imageUrl) {
          oldUrlsToDelete.push(delProd.imageUrl);
        }
      }
    }

    const updatedCatalog = await updateOwnedCatalogAndProductsTx({
      catalogId: existing.id,
      userId,
      catalogData: {
        storeName: cleanStoreName,
        logoUrl: nextLogoUrl,
        themeColor,
        whatsapp: cleanWhatsapp,
        pixKey: cleanPixKey,
        depositPct,
        minOrderCents,
        paymentNotice: cleanPaymentNotice,
        deliveryDates,
        notes: cleanNotes,
        pickupAddress: cleanPickupAddress,
        pickupInstructions: cleanPickupInstructions,
        deliveryEstimate: cleanDeliveryEstimate,
        notifyOrderByEmail,
        ...(bioLinksConfigToPersist !== undefined
          ? { bioLinksConfig: bioLinksConfigToPersist }
          : {}),
      },
      toDeleteProductIds,
      preparedProducts,
    });

    // Remove imagens substituídas ou de produtos excluídos em um único lote no R2
    if (oldUrlsToDelete.length > 0) {
      const retainedUrls = new Set<string>();
      if (updatedCatalog?.logoUrl) {
        retainedUrls.add(updatedCatalog.logoUrl);
      }
      for (const prod of updatedCatalog?.products || []) {
        if (prod.imageUrl) {
          retainedUrls.add(prod.imageUrl);
        }
      }
      const updatedBioConfig =
        updatedCatalog?.bioLinksConfig &&
        typeof updatedCatalog.bioLinksConfig === 'object'
          ? (updatedCatalog.bioLinksConfig as ExistingBioLinksConfig)
          : null;
      if (
        typeof updatedBioConfig?.bannerUrl === 'string' &&
        updatedBioConfig.bannerUrl.length > 0
      ) {
        retainedUrls.add(updatedBioConfig.bannerUrl);
      }
      if (Array.isArray(updatedBioConfig?.links)) {
        for (const link of updatedBioConfig.links) {
          if (typeof link?.imageUrl === 'string' && link.imageUrl.length > 0) {
            retainedUrls.add(link.imageUrl);
          }
        }
      }
      const safeUrlsToDelete = oldUrlsToDelete.filter(
        (url) => !retainedUrls.has(url)
      );
      if (safeUrlsToDelete.length > 0) {
        void deleteImagesFromR2(safeUrlsToDelete);
      }
    }

    return updatedCatalog
      ? {
          ...updatedCatalog,
          storeAppearance: extractStoreAppearance(updatedCatalog.bioLinksConfig),
        }
      : updatedCatalog;
  } catch (innerErr) {
    if (newlyUploadedUrls.length > 0) {
      void deleteImagesFromR2(newlyUploadedUrls);
    }
    throw innerErr;
  }
}
