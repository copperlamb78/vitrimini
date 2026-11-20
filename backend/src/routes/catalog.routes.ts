import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { assertValidImageMagicBytes, upload } from '../config/upload.js';
import { generateUniqueSlug } from '../utils/slug.js';
import {
  calculatePixFeeFallback,
  createPixPayment,
  isMockPixEnabled,
  resolvePlanDefinition,
  validateMercadoPagoWebhookSignature,
  verifyMercadoPagoOrder,
} from '../services/payment.service.js';
import { hasProFeatures } from '../services/mpOAuth.service.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import { getOptionalAuthUserId, requireAuth } from '../middlewares/auth.js';
import {
  cleanupExpiredCatalogs,
  GRACE_PERIOD_MS,
} from '../services/cleanup.service.js';
import {
  sendCatalogPublishedEmail,
  sendCatalogRenewedEmail,
} from '../services/email.service.js';
import {
  deleteImagesFromR2,
  uploadImageToR2,
} from '../services/r2.service.js';
import {
  brazilianPhoneSchema,
  catalogMetadataSchema,
  productInputSchema,
  sanitizePlainText,
} from '../utils/validation.js';

const router = Router();

const catalogWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas solicitações seguidas. Aguarde alguns minutos e tente novamente.',
  },
});

const publicStoreRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas requisições para esta vitrine. Aguarde alguns instantes e tente novamente.',
  },
});

const catalogStatusRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas consultas de pagamento em sequência. Aguarde alguns instantes e tente novamente.',
  },
});

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ALLOWED_THEMES = new Set([
  'rose',
  'red',
  'amber',
  'emerald',
  'purple',
  'zinc',
]);

const productsArraySchema = z
  .array(productInputSchema)
  .min(1, 'Adicione pelo menos um produto válido.')
  .max(300, 'Limite máximo de produtos por requisição excedido.');

const uuidParamSchema = z.string().uuid('Código inválido.');

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    if (value.length > 500_000) {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
  }
  return value as T;
}

function parseBoolean(value: unknown, defaultValue = true): boolean {
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

function normalizeThemeColor(raw: unknown): 'rose' | 'red' | 'amber' | 'emerald' | 'purple' | 'zinc' {
  if (typeof raw === 'string' && ALLOWED_THEMES.has(raw.trim())) {
    return raw.trim() as 'rose' | 'red' | 'amber' | 'emerald' | 'purple' | 'zinc';
  }
  return 'rose';
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
  const txResult = await prisma.$transaction(async (tx) => {
    const paymentRecord = await tx.catalogPayment.findUnique({
      where: { id: paymentRecordId },
      include: {
        catalog: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!paymentRecord) {
      throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
    }

    const fallback = calculatePixFeeFallback(paymentRecord.amountCents);
    const feeCents = feeOverride?.feeCents ?? fallback.feeCents;
    const netAmountCents =
      feeOverride?.netAmountCents ??
      Math.max(0, paymentRecord.amountCents - feeCents);

    // Trava atômica anti-race-condition: garante transição única PENDING -> PAID
    const claimed = await tx.catalogPayment.updateMany({
      where: { id: paymentRecord.id, status: 'PENDING' },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        feeCents,
        netAmountCents,
      },
    });

    if (claimed.count === 0) {
      return {
        catalog: paymentRecord.catalog,
        justConfirmed: false,
        type: paymentRecord.type,
        user: paymentRecord.user,
      };
    }

    const now = Date.now();
    const currentExpires = paymentRecord.catalog.expiresAt;
    const planDef = resolvePlanDefinition(paymentRecord.planCode);
    const planDurationMs = planDef.days * 24 * 60 * 60 * 1000;
    const nextPlanType = resolveNextPlanType(
      paymentRecord.catalog,
      planDef.planType,
      now
    );

    if (paymentRecord.type === 'RENEWAL') {
      const baseTime =
        currentExpires && currentExpires.getTime() > now
          ? currentExpires.getTime()
          : now;

      const updatedCatalog = await tx.catalog.update({
        where: { id: paymentRecord.catalogId },
        data: {
          status: 'ACTIVE',
          isTrial: false,
          planType: nextPlanType,
          renewalCount: { increment: 1 },
          expiresAt: new Date(baseTime + planDurationMs),
          notified7DaysBefore: false,
          notifiedExpiration: false,
        },
      });

      return {
        catalog: updatedCatalog,
        justConfirmed: true,
        type: paymentRecord.type,
        user: paymentRecord.user,
      };
    }

    const creationBaseTime =
      currentExpires && currentExpires.getTime() > now
        ? currentExpires.getTime()
        : now;

    const updatedCatalog = await tx.catalog.update({
      where: { id: paymentRecord.catalogId },
      data: {
        status: 'ACTIVE',
        isTrial: false,
        planType: nextPlanType,
        expiresAt: new Date(creationBaseTime + planDurationMs),
        notified7DaysBefore: false,
        notifiedExpiration: false,
      },
    });

    return {
      catalog: updatedCatalog,
      justConfirmed: true,
      type: paymentRecord.type,
      user: paymentRecord.user,
    };
  });

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

// POST /api/catalogs (Protegida com requireAuth)
router.post(
  '/catalogs',
  requireAuth,
  catalogWriteRateLimiter,
  upload.any(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const rawDeliveryDates = parseJsonField<unknown>(
        req.body.deliveryDates,
        []
      );
      const rawProducts = parseJsonField<unknown>(req.body.products, []);

      if (!Array.isArray(rawDeliveryDates) || !Array.isArray(rawProducts)) {
        throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
      }

      const meta = catalogMetadataSchema.parse({
        storeName: req.body.storeName,
        whatsapp: req.body.whatsapp,
        pixKey: req.body.pixKey,
        depositPct: req.body.depositPct,
        minOrderCents: req.body.minOrderCents,
        paymentNotice: req.body.paymentNotice,
        themeColor: normalizeThemeColor(req.body.themeColor),
        notes: req.body.notes,
        deliveryDates: rawDeliveryDates,
      });

      const validatedProducts = productsArraySchema.parse(rawProducts);

      // Todas as validações passaram — agora subimos as imagens otimizadas ao Cloudflare R2
      const files = (req.files as Express.Multer.File[]) || [];
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
        const planDef = resolvePlanDefinition(req.body.planCode);
        const amountCents = planDef.amountCents;

        const [dbUser, existingTrialByWhatsapp] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { hasUsedTrial: true },
          }),
          prisma.catalog.findFirst({
            where: { whatsapp: meta.whatsapp, isTrial: true },
            select: { id: true },
          }),
        ]);

        const isEligibleForTrial = Boolean(
          dbUser && !dbUser.hasUsedTrial && !existingTrialByWhatsapp
        );

        if (isEligibleForTrial) {
          const trialCatalog = await prisma.$transaction(async (tx) => {
            const claimed = await tx.user.updateMany({
              where: { id: userId, hasUsedTrial: false },
              data: { hasUsedTrial: true },
            });

            if (claimed.count === 0) {
              return null;
            }

            return tx.catalog.create({
              data: {
                slug,
                status: 'ACTIVE',
                isTrial: true,
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
                products: {
                  create: productsData,
                },
              },
            });
          });

          if (trialCatalog) {
            res.status(201).json({
              catalogId: trialCatalog.id,
              slug: trialCatalog.slug,
              editToken: trialCatalog.editToken,
              activatedByTrial: true,
              expiresAt: trialCatalog.expiresAt,
            });
            return;
          }
        }

        const catalog = await prisma.catalog.create({
          data: {
            slug,
            status: 'DRAFT',
            isTrial: false,
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
            products: {
              create: productsData,
            },
          },
        });

        const payment = await createPixPayment({
          catalogId: catalog.id,
          storeName: catalog.storeName,
          amountCents,
          description: planDef.label,
          payerEmail: req.user!.email,
        });

        const paymentRecord = await prisma.catalogPayment.create({
          data: {
            userId,
            catalogId: catalog.id,
            type: 'CREATION',
            planCode: planDef.code,
            status: 'PENDING',
            amountCents,
            gatewayId: payment.paymentId,
          },
        });

        await prisma.catalog.update({
          where: { id: catalog.id },
          data: { paymentId: payment.paymentId },
        });

        res.status(201).json({
          catalogId: catalog.id,
          paymentRecordId: paymentRecord.id,
          slug: catalog.slug,
          editToken: catalog.editToken,
          qrCodeBase64: payment.qrCodeBase64,
          pixCopyPaste: payment.pixCopyPaste,
          mockMode: payment.mockMode,
          activatedByTrial: false,
        });
      } catch (innerErr) {
        if (uploadedUrls.length > 0) {
          void deleteImagesFromR2(uploadedUrls);
        }
        throw innerErr;
      }
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/catalogs/:id/renew (Protegida com requireAuth + anti-IDOR)
router.post(
  '/catalogs/:id/renew',
  requireAuth,
  catalogWriteRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const catalogId = uuidParamSchema.parse(req.params.id);

      const catalog = await prisma.catalog.findUnique({
        where: { id: catalogId },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== userId) {
        throw new AppError(403, 'Você não tem permissão para alterar esta vitrine.');
      }

      const planDef = resolvePlanDefinition(req.body?.planCode);
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
        payerEmail: req.user!.email,
        idempotencyKey: `vitrimini-renew-${catalog.id}-${Date.now()}`,
      });

      const paymentRecord = await prisma.catalogPayment.create({
        data: {
          userId,
          catalogId: catalog.id,
          type: paymentType,
          planCode: planDef.code,
          status: 'PENDING',
          amountCents,
          gatewayId: payment.paymentId,
        },
      });

      await prisma.catalog.update({
        where: { id: catalog.id },
        data: { paymentId: payment.paymentId },
      });

      res.json({
        catalogId: catalog.id,
        paymentRecordId: paymentRecord.id,
        slug: catalog.slug,
        editToken: catalog.editToken,
        qrCodeBase64: payment.qrCodeBase64,
        pixCopyPaste: payment.pixCopyPaste,
        mockMode: payment.mockMode,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/my-catalogs (Protegida com requireAuth)
router.get(
  '/my-catalogs',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      void cleanupExpiredCatalogs();

      const nowMs = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      const [catalogs, dbUser] = await Promise.all([
        prisma.catalog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            storeName: true,
            slug: true,
            editToken: true,
            status: true,
            isTrial: true,
            planType: true,
            onlinePaymentEnabled: true,
            mpUserId: true,
            expiresAt: true,
            renewalCount: true,
            logoUrl: true,
            themeColor: true,
            createdAt: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { hasUsedTrial: true },
        }),
      ]);

      const enriched = catalogs.map((cat) => {
        const expiresMs = cat.expiresAt ? cat.expiresAt.getTime() : null;
        const isExpired =
          cat.status === 'EXPIRED' ||
          (expiresMs !== null && expiresMs < nowMs);

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

      res.json({
        catalogs: enriched,
        canUseTrial: !dbUser?.hasUsedTrial,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/catalogs/:id/status (Protegida com requireAuth + anti-IDOR)
router.get(
  '/catalogs/:id/status',
  catalogStatusRateLimiter,
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const id = uuidParamSchema.parse(req.params.id);
      const paymentRecordId = req.query.paymentRecordId
        ? uuidParamSchema.parse(String(req.query.paymentRecordId))
        : undefined;

      const catalog = await prisma.catalog.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          status: true,
          slug: true,
          editToken: true,
          expiresAt: true,
          renewalCount: true,
        },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== userId) {
        throw new AppError(403, 'Você não tem permissão para consultar esta vitrine.');
      }

      const targetPayment = paymentRecordId
        ? await prisma.catalogPayment.findFirst({
            where: { id: paymentRecordId, catalogId: id },
          })
        : await prisma.catalogPayment.findFirst({
            where: { catalogId: id },
            orderBy: { createdAt: 'desc' },
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
            const updatedCatalog = await confirmCatalogPayment(
              targetPayment.id,
              {
                feeCents: verification.feeCents,
                netAmountCents: verification.netAmountCents,
              }
            );
            res.json({
              status: updatedCatalog.status,
              slug: updatedCatalog.slug,
              editToken: updatedCatalog.editToken,
              expiresAt: updatedCatalog.expiresAt,
              renewalCount: updatedCatalog.renewalCount,
              paymentPaid: true,
            });
            return;
          }
        } catch (verifyErr) {
          console.error('[Polling Fallback Verify Error]:', verifyErr);
        }
      }

      res.json({
        status: catalog.status,
        slug: catalog.slug,
        editToken: catalog.editToken,
        expiresAt: catalog.expiresAt,
        renewalCount: catalog.renewalCount,
        paymentPaid: targetPayment
          ? targetPayment.status === 'PAID'
          : catalog.status === 'ACTIVE',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/catalogs/:id/mock-pay (Protegida com requireAuth + anti-IDOR, apenas quando MOCK_PIX=true)
router.post(
  '/catalogs/:id/mock-pay',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isMockPixEnabled()) {
        throw new AppError(
          403,
          'Pagamento simulado indisponível neste ambiente.'
        );
      }

      const userId = req.user!.id;
      const id = uuidParamSchema.parse(req.params.id);
      const existing = await prisma.catalog.findUnique({ where: { id } });

      if (!existing) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (existing.userId !== userId) {
        throw new AppError(403, 'Você não tem permissão para alterar esta vitrine.');
      }

      const pendingPayment = await prisma.catalogPayment.findFirst({
        where: { catalogId: id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      if (pendingPayment) {
        const updated = await confirmCatalogPayment(pendingPayment.id);
        res.json({
          status: updated.status,
          slug: updated.slug,
          editToken: updated.editToken,
          expiresAt: updated.expiresAt,
          renewalCount: updated.renewalCount,
          paymentPaid: true,
        });
        return;
      }

      const planDef = resolvePlanDefinition(req.body?.planCode);
      const now = Date.now();
      const baseTime =
        existing.expiresAt && existing.expiresAt.getTime() > now
          ? existing.expiresAt.getTime()
          : now;
      const expiresAt = new Date(
        baseTime + planDef.days * 24 * 60 * 60 * 1000
      );
      const updated = await prisma.catalog.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          isTrial: false,
          planType: resolveNextPlanType(existing, planDef.planType, now),
          expiresAt,
        },
        select: {
          status: true,
          slug: true,
          editToken: true,
          expiresAt: true,
          renewalCount: true,
        },
      });

      res.json({ ...updated, paymentPaid: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/webhooks/pix
router.post(
  '/webhooks/pix',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body || {};
      const queryDataId = req.query['data.id']
        ? String(req.query['data.id'])
        : undefined;
      const bodyDataId = body?.data?.id ? String(body.data.id) : undefined;
      const mpOrderId = queryDataId || bodyDataId;

      if (!isMockPixEnabled()) {
        if (!mpOrderId) {
          throw new AppError(401, 'Assinatura de webhook ausente.');
        }

        const isSignatureValid = validateMercadoPagoWebhookSignature({
          xSignature: req.headers['x-signature'] as string | undefined,
          xRequestId: req.headers['x-request-id'] as string | undefined,
          dataId: mpOrderId,
        });

        if (!isSignatureValid) {
          throw new AppError(401, 'Assinatura de webhook inválida.');
        }
      }

      if (mpOrderId && !isMockPixEnabled()) {
        const paymentRecord = await prisma.catalogPayment.findFirst({
          where: { gatewayId: mpOrderId },
          orderBy: { createdAt: 'desc' },
        });

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
          if (verification.approved && verification.catalogId) {
            const fallbackRecord = await prisma.catalogPayment.findFirst({
              where: {
                catalogId: verification.catalogId,
                status: 'PENDING',
                OR: [{ gatewayId: null }, { gatewayId: mpOrderId }],
              },
              orderBy: { createdAt: 'desc' },
            });
            if (
              fallbackRecord &&
              typeof verification.paidCents === 'number' &&
              verification.paidCents >= fallbackRecord.amountCents &&
              (!verification.catalogId ||
                verification.catalogId === fallbackRecord.catalogId)
            ) {
              await confirmCatalogPayment(fallbackRecord.id, {
                feeCents: verification.feeCents,
                netAmountCents: verification.netAmountCents,
              });
            }
          }
        }

        res.status(200).json({ received: true });
        return;
      }

      if (isMockPixEnabled()) {
        let targetCatalogId: string | undefined =
          body.catalogId || body?.data?.external_reference;
        const targetGatewayId: string | undefined = body.paymentId || mpOrderId;
        let approved =
          body.status === 'approved' ||
          body.action === 'order.processed' ||
          body?.data?.status === 'processed';
        let approvedFeeOverride:
          | { feeCents?: number; netAmountCents?: number }
          | undefined;

        const paymentRecord = targetGatewayId
          ? await prisma.catalogPayment.findFirst({
              where: { gatewayId: targetGatewayId },
              orderBy: { createdAt: 'desc' },
            })
          : targetCatalogId
            ? await prisma.catalogPayment.findFirst({
                where: { catalogId: targetCatalogId, status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
              })
            : null;

        if (mpOrderId) {
          const verification = await verifyMercadoPagoOrder(
            mpOrderId,
            paymentRecord?.amountCents
          );
          approved = verification.approved;
          if (verification.catalogId) {
            targetCatalogId = verification.catalogId;
          }
          approvedFeeOverride = {
            feeCents: verification.feeCents,
            netAmountCents: verification.netAmountCents,
          };
        }

        if (approved && paymentRecord) {
          await confirmCatalogPayment(paymentRecord.id, approvedFeeOverride);
        } else if (approved && targetCatalogId) {
          const catalog = await prisma.catalog.findUnique({
            where: { id: targetCatalogId },
          });
          if (catalog && catalog.status !== 'ACTIVE') {
            await prisma.catalog.update({
              where: { id: catalog.id },
              data: {
                status: 'ACTIVE',
                expiresAt: new Date(Date.now() + NINETY_DAYS_MS),
              },
            });
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/store/:slug
router.get(
  '/store/:slug',
  publicStoreRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = String(req.params.slug || '').trim().toLowerCase();
      if (!slug || slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      const isPreview = req.query.preview === 'true';

      const catalog = await prisma.catalog.findUnique({
        where: { slug },
        select: {
          id: true,
          userId: true,
          slug: true,
          status: true,
          isTrial: true,
          planType: true,
          onlinePaymentEnabled: true,
          mpAccessToken: true,
          storeName: true,
          logoUrl: true,
          themeColor: true,
          whatsapp: true,
          pixKey: true,
          depositPct: true,
          minOrderCents: true,
          paymentNotice: true,
          deliveryDates: true,
          notes: true,
          expiresAt: true,
          products: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              priceCents: true,
              imageUrl: true,
              orderIndex: true,
              available: true,
            },
          },
        },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      const requesterId = isPreview ? getOptionalAuthUserId(req) : null;
      const isAuthorizedPreview = isPreview && requesterId === catalog.userId;

      if (!isAuthorizedPreview) {
        if (
          catalog.status === 'EXPIRED' ||
          (catalog.expiresAt && catalog.expiresAt < new Date())
        ) {
          if (catalog.status !== 'EXPIRED') {
            await prisma.catalog.update({
              where: { id: catalog.id },
              data: { status: 'EXPIRED' },
            });
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

      if (isPreview) {
        res.setHeader('Cache-Control', 'no-store');
      } else {
        res.setHeader(
          'Cache-Control',
          'public, max-age=15, stale-while-revalidate=30'
        );
      }

      res.json({
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
        products: catalog.products,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/catalogs/resolve-token/:editToken (Protegida com requireAuth + ownership)
router.get(
  '/catalogs/resolve-token/:editToken',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const editToken = uuidParamSchema.parse(req.params.editToken);
      const catalog = await prisma.catalog.findUnique({
        where: { editToken },
        select: { id: true, userId: true },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== req.user!.id) {
        throw new AppError(
          403,
          'Esta vitrine pertence a outra conta. Entre com o e-mail proprietário.'
        );
      }

      res.json({ catalogId: catalog.id });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/catalogs/:id (Protegida com requireAuth + ownership)
router.get(
  '/catalogs/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = uuidParamSchema.parse(req.params.id);
      const catalog = await prisma.catalog.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          slug: true,
          editToken: true,
          status: true,
          isTrial: true,
          planType: true,
          onlinePaymentEnabled: true,
          mpUserId: true,
          renewalCount: true,
          storeName: true,
          logoUrl: true,
          themeColor: true,
          whatsapp: true,
          pixKey: true,
          depositPct: true,
          minOrderCents: true,
          paymentNotice: true,
          deliveryDates: true,
          notes: true,
          pickupAddress: true,
          pickupInstructions: true,
          deliveryEstimate: true,
          notifyOrderByEmail: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          products: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== req.user!.id) {
        throw new AppError(403, 'Você não tem permissão para acessar esta vitrine.');
      }

      const { userId: _ownerId, mpUserId: catMpUserId, ...safeCatalog } = catalog;
      res.json({
        ...safeCatalog,
        mpConnected: Boolean(catMpUserId),
        hasProAccess: hasProFeatures(catalog),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/manage/:editToken (Aposentado acesso anônimo — exige requireAuth + ownership)
router.get(
  '/manage/:editToken',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const editToken = uuidParamSchema.parse(req.params.editToken);
      const catalog = await prisma.catalog.findUnique({
        where: { editToken },
        select: {
          id: true,
          userId: true,
          slug: true,
          editToken: true,
          status: true,
          isTrial: true,
          planType: true,
          onlinePaymentEnabled: true,
          mpUserId: true,
          renewalCount: true,
          storeName: true,
          logoUrl: true,
          themeColor: true,
          whatsapp: true,
          pixKey: true,
          depositPct: true,
          minOrderCents: true,
          paymentNotice: true,
          deliveryDates: true,
          notes: true,
          pickupAddress: true,
          pickupInstructions: true,
          deliveryEstimate: true,
          notifyOrderByEmail: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          products: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== req.user!.id) {
        throw new AppError(403, 'Você não tem permissão para acessar esta vitrine.');
      }

      const { userId: _ownerId, mpUserId: catMpUserId, ...safeCatalog } = catalog;
      res.json({
        ...safeCatalog,
        mpConnected: Boolean(catMpUserId),
        hasProAccess: hasProFeatures(catalog),
      });
    } catch (error) {
      next(error);
    }
  }
);

async function handleAuthenticatedCatalogUpdate(
  req: Request,
  res: Response,
  next: NextFunction,
  lookup: { id?: string; editToken?: string }
) {
  try {
    const existing = await prisma.catalog.findUnique({
      where: lookup.id ? { id: lookup.id } : { editToken: lookup.editToken },
      include: { products: true },
    });

    if (!existing) {
      throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
    }

    if (existing.userId !== req.user!.id) {
      throw new AppError(403, 'Você não tem permissão para alterar esta vitrine.');
    }

    const notifyOrderByEmail =
      req.body.notifyOrderByEmail !== undefined
        ? parseBoolean(req.body.notifyOrderByEmail, existing.notifyOrderByEmail)
        : existing.notifyOrderByEmail;

      const rawStoreName =
        req.body.storeName !== undefined
          ? String(req.body.storeName)
          : existing.storeName;
      const cleanStoreName = sanitizePlainText(rawStoreName);
      if (cleanStoreName.length < 2 || cleanStoreName.length > 100) {
        throw new AppError(
          400,
          'O nome da loja deve ter entre 2 e 100 caracteres.'
        );
      }

      const cleanWhatsapp =
        req.body.whatsapp !== undefined
          ? brazilianPhoneSchema.parse(req.body.whatsapp)
          : existing.whatsapp;

      const depositPctRaw = req.body.depositPct;
      const depositPct =
        depositPctRaw !== undefined ? Number(depositPctRaw) : existing.depositPct;

      if (![0, 50, 100].includes(depositPct)) {
        throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
      }

      const minOrderCentsRaw = req.body.minOrderCents;
      const minOrderCents =
        minOrderCentsRaw !== undefined && minOrderCentsRaw !== ''
          ? Number(minOrderCentsRaw)
          : existing.minOrderCents;

      if (
        !Number.isInteger(minOrderCents) ||
        minOrderCents < 0 ||
        minOrderCents > 10000000
      ) {
        throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
      }

      const themeColor =
        req.body.themeColor !== undefined
          ? normalizeThemeColor(req.body.themeColor)
          : existing.themeColor;

      const rawDeliveryDates =
        req.body.deliveryDates !== undefined
          ? parseJsonField<unknown>(req.body.deliveryDates, existing.deliveryDates)
          : existing.deliveryDates;

      if (!Array.isArray(rawDeliveryDates) || rawDeliveryDates.length > 60) {
        throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
      }

      const deliveryDates = rawDeliveryDates
        .map((d) => sanitizePlainText(String(d)).slice(0, 120))
        .filter(Boolean);

      const cleanPixKey =
        req.body.pixKey !== undefined
          ? req.body.pixKey
            ? sanitizePlainText(String(req.body.pixKey)).slice(0, 140)
            : null
          : existing.pixKey;

      const cleanPaymentNotice =
        req.body.paymentNotice !== undefined
          ? req.body.paymentNotice
            ? sanitizePlainText(String(req.body.paymentNotice)).slice(0, 140) || null
            : null
          : existing.paymentNotice;

      const cleanNotes =
        req.body.notes !== undefined
          ? req.body.notes
            ? sanitizePlainText(String(req.body.notes)).slice(0, 1000)
            : null
          : existing.notes;

      const cleanPickupAddress =
        req.body.pickupAddress !== undefined
          ? req.body.pickupAddress
            ? sanitizePlainText(String(req.body.pickupAddress)).slice(0, 240)
            : null
          : existing.pickupAddress;

      const cleanPickupInstructions =
        req.body.pickupInstructions !== undefined
          ? req.body.pickupInstructions
            ? sanitizePlainText(String(req.body.pickupInstructions)).slice(0, 200)
            : null
          : existing.pickupInstructions;

      const cleanDeliveryEstimate =
        req.body.deliveryEstimate !== undefined
          ? req.body.deliveryEstimate
            ? sanitizePlainText(String(req.body.deliveryEstimate)).slice(0, 100)
            : null
          : existing.deliveryEstimate;

      const incomingProducts =
        req.body.products !== undefined
          ? productsArraySchema.parse(
              parseJsonField<unknown>(req.body.products, [])
            )
          : undefined;

      // Todas as validações passaram — agora processamos uploads ao R2 e mapeamos fotos antigas para exclusão em lote
      const files = (req.files as Express.Multer.File[]) || [];
      const fileByField = new Map<string, Express.Multer.File>();
      for (const file of files) {
        assertValidImageMagicBytes(file.buffer, file.mimetype);
        fileByField.set(file.fieldname, file);
      }

      const logoFile = fileByField.get('logo');
      const removeLogo =
        req.body.removeLogo === 'true' || req.body.removeLogo === true;

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
        } else if (removeLogo) {
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

        const preparedProducts = incomingProducts
          ? await Promise.all(
              incomingProducts.map(async (p, index) => {
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
                  id: p.id,
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

        const updatedCatalog = await prisma.$transaction(async (tx) => {
          await tx.catalog.update({
            where: { id: existing.id },
            data: {
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
            },
          });

          if (preparedProducts) {
            const existingIds = new Set(existing.products.map((p) => p.id));
            const keptIds = new Set(
              preparedProducts
                .map((p) => p.id)
                .filter((id): id is string => Boolean(id && existingIds.has(id)))
            );

            const deletedProducts = existing.products.filter(
              (p) => !keptIds.has(p.id)
            );
            const toDeleteIds = deletedProducts.map((p) => p.id);

            for (const delProd of deletedProducts) {
              if (delProd.imageUrl) {
                oldUrlsToDelete.push(delProd.imageUrl);
              }
            }

            if (toDeleteIds.length > 0) {
              await tx.product.deleteMany({
                where: {
                  id: { in: toDeleteIds },
                  catalogId: existing.id,
                },
              });
            }

            for (const item of preparedProducts) {
              if (item.id && existingIds.has(item.id)) {
                await tx.product.update({
                  where: { id: item.id },
                  data: item.payload,
                });
              } else {
                await tx.product.create({
                  data: {
                    ...item.payload,
                    catalogId: existing.id,
                  },
                });
              }
            }
          }

          return tx.catalog.findUnique({
            where: { id: existing.id },
            select: {
              id: true,
              slug: true,
              editToken: true,
              status: true,
              isTrial: true,
              renewalCount: true,
              storeName: true,
              logoUrl: true,
              themeColor: true,
              whatsapp: true,
              pixKey: true,
              depositPct: true,
              minOrderCents: true,
              paymentNotice: true,
              deliveryDates: true,
              notes: true,
              notifyOrderByEmail: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
              products: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          });
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
          const safeUrlsToDelete = oldUrlsToDelete.filter(
            (url) => !retainedUrls.has(url)
          );
          if (safeUrlsToDelete.length > 0) {
            void deleteImagesFromR2(safeUrlsToDelete);
          }
        }

        res.json(updatedCatalog);
      } catch (innerErr) {
        if (newlyUploadedUrls.length > 0) {
          void deleteImagesFromR2(newlyUploadedUrls);
        }
        throw innerErr;
      }
    } catch (error) {
      next(error);
    }
}

// PUT /api/catalogs/:id (Protegida com requireAuth + ownership)
router.put(
  '/catalogs/:id',
  requireAuth,
  catalogWriteRateLimiter,
  upload.any(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = uuidParamSchema.parse(req.params.id);
      await handleAuthenticatedCatalogUpdate(req, res, next, { id });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/manage/:editToken (Aposentado acesso anônimo — exige requireAuth + ownership)
router.put(
  '/manage/:editToken',
  requireAuth,
  catalogWriteRateLimiter,
  upload.any(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const editToken = uuidParamSchema.parse(req.params.editToken);
      await handleAuthenticatedCatalogUpdate(req, res, next, { editToken });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
