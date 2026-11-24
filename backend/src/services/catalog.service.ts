import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { assertValidImageMagicBytes } from '../config/upload.js';
import { markMerchantCache } from '../middlewares/auth.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import {
  activateCatalogFromMockWebhook,
  activateOwnedCatalogMockDirect,
  confirmCatalogPaymentTx,
  createCatalogPaymentRecord,
  createDraftCatalog,
  createTrialCatalogTx,
  findCatalogByIdForWebhook,
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
  markOwnedCatalogExpired,
  PreparedProductPersistenceItem,
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
  calculatePixFeeFallback,
  createPixPayment,
  isMockPixEnabled,
  resolvePlanDefinition,
  validateMercadoPagoWebhookSignature,
  verifyMercadoPagoOrder,
} from './payment.service.js';
import { deleteImagesFromR2, uploadImageToR2 } from './r2.service.js';
import { generateUniqueSlug } from '../utils/slug.js';
import {
  bioLinksConfigSchema,
  catalogMetadataSchema,
  productInputSchema,
} from '../utils/validation.js';

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  | 'zinc';

export function normalizeThemeColor(raw: unknown): CatalogThemeColor {
  if (typeof raw === 'string' && ALLOWED_THEMES.has(raw.trim())) {
    return raw.trim() as CatalogThemeColor;
  }
  return 'rose';
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
      const planDurationMs = planDef.days * DAY_MS;
      const nextPlanType = resolveNextPlanType(
        paymentRecord.catalog,
        planDef.planType,
        nowMs
      );

      return {
        feeCents,
        netAmountCents,
        planDurationMs,
        nextPlanType,
        nowMs,
      };
    },
  });

  if (!txResult) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
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
  const expiresAt = new Date(baseTime + planDef.days * DAY_MS);

  const updated = await activateOwnedCatalogMockDirect({
    id: existing.id,
    userId,
    planType: resolveNextPlanType(existing, planDef.planType, now),
    expiresAt,
  });

  return { ...updated, paymentPaid: true };
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
          new Date(Date.now() + NINETY_DAYS_MS)
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
  removeLogo: boolean;
}

type ExistingBioLinksConfig = {
  bannerUrl?: string | null;
  links?: Array<{ id?: string; imageUrl?: string | null }>;
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

  const nextBioLinksConfig = payload.bioLinksConfig;
  if (nextBioLinksConfig) {
    if (nextBioLinksConfig.enabled && !hasProFeatures(existing)) {
      throw new AppError(
        403,
        'A publicação da Página de Links da Bio é exclusiva do Plano Pro.'
      );
    }
  }

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

    const existingBioConfig =
      existing.bioLinksConfig && typeof existing.bioLinksConfig === 'object'
        ? (existing.bioLinksConfig as ExistingBioLinksConfig)
        : null;

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
        ...(nextBioLinksConfig !== undefined
          ? { bioLinksConfig: nextBioLinksConfig as Prisma.InputJsonValue }
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

    return updatedCatalog;
  } catch (innerErr) {
    if (newlyUploadedUrls.length > 0) {
      void deleteImagesFromR2(newlyUploadedUrls);
    }
    throw innerErr;
  }
}
