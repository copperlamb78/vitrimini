import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { upload } from '../config/upload.js';
import { generateUniqueSlug } from '../utils/slug.js';
import {
  createPixPayment,
  getCatalogPriceCents,
  isMockPixEnabled,
  validateMercadoPagoWebhookSignature,
  verifyMercadoPagoOrder,
} from '../services/payment.service.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import { requireAuth } from '../middlewares/auth.js';
import {
  cleanupExpiredCatalogs,
  GRACE_PERIOD_MS,
} from '../services/cleanup.service.js';
import {
  brazilianPhoneSchema,
  catalogMetadataSchema,
  productInputSchema,
  sanitizePlainText,
} from '../utils/validation.js';

const router = Router();

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

const uuidParamSchema = z.string().uuid('Identificador inválido.');

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

async function confirmCatalogPayment(paymentRecordId: string) {
  return prisma.$transaction(async (tx) => {
    const paymentRecord = await tx.catalogPayment.findUnique({
      where: { id: paymentRecordId },
      include: { catalog: true },
    });

    if (!paymentRecord) {
      throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
    }

    if (paymentRecord.status === 'PAID') {
      return paymentRecord.catalog;
    }

    await tx.catalogPayment.update({
      where: { id: paymentRecord.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    const now = Date.now();
    const currentExpires = paymentRecord.catalog.expiresAt;

    if (paymentRecord.type === 'RENEWAL') {
      const baseTime =
        currentExpires && currentExpires.getTime() > now
          ? currentExpires.getTime()
          : now;

      return tx.catalog.update({
        where: { id: paymentRecord.catalogId },
        data: {
          status: 'ACTIVE',
          renewalCount: { increment: 1 },
          expiresAt: new Date(baseTime + NINETY_DAYS_MS),
        },
      });
    }

    return tx.catalog.update({
      where: { id: paymentRecord.catalogId },
      data: {
        status: 'ACTIVE',
        expiresAt: new Date(now + NINETY_DAYS_MS),
      },
    });
  });
}

// POST /api/catalogs (Protegida com requireAuth)
router.post(
  '/catalogs',
  requireAuth,
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
        themeColor: normalizeThemeColor(req.body.themeColor),
        notes: req.body.notes,
        deliveryDates: rawDeliveryDates,
      });

      const validatedProducts = productsArraySchema.parse(rawProducts);

      const files = (req.files as Express.Multer.File[]) || [];
      const fileByField = new Map<string, Express.Multer.File>();
      for (const file of files) {
        fileByField.set(file.fieldname, file);
      }

      const logoFile = fileByField.get('logo');
      const logoUrl = logoFile ? `/uploads/${logoFile.filename}` : null;

      const productsData = validatedProducts.map((p, index) => {
        const uploadedFile = p.imageField
          ? fileByField.get(p.imageField)
          : undefined;
        const imageUrl = uploadedFile
          ? `/uploads/${uploadedFile.filename}`
          : p.imageUrl || null;

        return {
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          imageUrl,
          orderIndex: p.orderIndex ?? index,
          available: parseBoolean(p.available, true),
        };
      });

      const slug = await generateUniqueSlug(meta.storeName);
      const amountCents = getCatalogPriceCents();

      const catalog = await prisma.catalog.create({
        data: {
          slug,
          status: 'DRAFT',
          userId,
          storeName: meta.storeName,
          logoUrl,
          themeColor: meta.themeColor,
          whatsapp: meta.whatsapp,
          pixKey: meta.pixKey,
          depositPct: meta.depositPct,
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
        payerEmail: req.user!.email,
      });

      const paymentRecord = await prisma.catalogPayment.create({
        data: {
          userId,
          catalogId: catalog.id,
          type: 'CREATION',
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
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/catalogs/:id/renew (Protegida com requireAuth + anti-IDOR)
router.post(
  '/catalogs/:id/renew',
  requireAuth,
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

      const amountCents = getCatalogPriceCents();
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
        payerEmail: req.user!.email,
        idempotencyKey: `vitrimini-renew-${catalog.id}-${Date.now()}`,
      });

      const paymentRecord = await prisma.catalogPayment.create({
        data: {
          userId,
          catalogId: catalog.id,
          type: paymentType,
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
      await cleanupExpiredCatalogs();

      const nowMs = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;

      const catalogs = await prisma.catalog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          storeName: true,
          slug: true,
          editToken: true,
          status: true,
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
      });

      const enriched = catalogs.map((cat) => {
        const expiresMs = cat.expiresAt ? cat.expiresAt.getTime() : null;
        const isExpired =
          cat.status === 'EXPIRED' ||
          (expiresMs !== null && expiresMs < nowMs);

        let daysLeftToDelete: number | null = null;
        if (isExpired && expiresMs !== null) {
          const deleteDeadlineMs = expiresMs + GRACE_PERIOD_MS;
          daysLeftToDelete = Math.max(
            1,
            Math.ceil((deleteDeadlineMs - nowMs) / DAY_MS)
          );
        }

        return {
          ...cat,
          status: isExpired ? ('EXPIRED' as const) : cat.status,
          isExpired,
          daysLeftToDelete,
        };
      });

      res.json({ catalogs: enriched });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/catalogs/:id/status (Protegida com requireAuth + anti-IDOR)
router.get(
  '/catalogs/:id/status',
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
            targetPayment.gatewayId
          );
          if (verification.approved) {
            const updatedCatalog = await confirmCatalogPayment(targetPayment.id);
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

      const expiresAt = new Date(Date.now() + NINETY_DAYS_MS);
      const updated = await prisma.catalog.update({
        where: { id },
        data: {
          status: 'ACTIVE',
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

      if (mpOrderId) {
        const isSignatureValid = validateMercadoPagoWebhookSignature({
          xSignature: req.headers['x-signature'] as string | undefined,
          xRequestId: req.headers['x-request-id'] as string | undefined,
          dataId: mpOrderId,
        });

        if (!isSignatureValid) {
          throw new AppError(401, 'Assinatura de webhook inválida.');
        }
      }

      let targetCatalogId: string | undefined =
        body.catalogId || body?.data?.external_reference;
      let targetGatewayId: string | undefined = body.paymentId || mpOrderId;
      let approved =
        body.status === 'approved' ||
        body.action === 'order.processed' ||
        body?.data?.status === 'processed';

      if (mpOrderId) {
        const verification = await verifyMercadoPagoOrder(mpOrderId);
        approved = verification.approved;
        targetGatewayId = mpOrderId;
        if (verification.catalogId) {
          targetCatalogId = verification.catalogId;
        }
      }

      if (approved && (targetGatewayId || targetCatalogId)) {
        const paymentRecord = targetGatewayId
          ? await prisma.catalogPayment.findFirst({
              where: { gatewayId: targetGatewayId },
              orderBy: { createdAt: 'desc' },
            })
          : await prisma.catalogPayment.findFirst({
              where: { catalogId: targetCatalogId, status: 'PENDING' },
              orderBy: { createdAt: 'desc' },
            });

        if (paymentRecord) {
          await confirmCatalogPayment(paymentRecord.id);
        } else if (targetCatalogId) {
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = String(req.params.slug || '').trim().toLowerCase();
      if (!slug || slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      const isPreview = req.query.preview === 'true';

      const catalog = await prisma.catalog.findUnique({
        where: { slug },
        include: {
          products: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (!isPreview) {
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
        deliveryDates: catalog.deliveryDates,
        notes: catalog.notes,
        expiresAt: catalog.expiresAt,
        products: catalog.products,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/manage/:editToken
router.get(
  '/manage/:editToken',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const editToken = uuidParamSchema.parse(req.params.editToken);
      const catalog = await prisma.catalog.findUnique({
        where: { editToken },
        select: {
          id: true,
          slug: true,
          editToken: true,
          status: true,
          renewalCount: true,
          storeName: true,
          logoUrl: true,
          themeColor: true,
          whatsapp: true,
          pixKey: true,
          depositPct: true,
          deliveryDates: true,
          notes: true,
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

      res.json(catalog);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/manage/:editToken
router.put(
  '/manage/:editToken',
  upload.any(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const editToken = uuidParamSchema.parse(req.params.editToken);
      const existing = await prisma.catalog.findUnique({
        where: { editToken },
        include: { products: true },
      });

      if (!existing) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

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
        .map((d) => sanitizePlainText(String(d)).slice(0, 80))
        .filter(Boolean);

      const cleanPixKey =
        req.body.pixKey !== undefined
          ? req.body.pixKey
            ? sanitizePlainText(String(req.body.pixKey)).slice(0, 140)
            : null
          : existing.pixKey;

      const cleanNotes =
        req.body.notes !== undefined
          ? req.body.notes
            ? sanitizePlainText(String(req.body.notes)).slice(0, 1000)
            : null
          : existing.notes;

      const files = (req.files as Express.Multer.File[]) || [];
      const fileByField = new Map<string, Express.Multer.File>();
      for (const file of files) {
        fileByField.set(file.fieldname, file);
      }

      const logoFile = fileByField.get('logo');
      const removeLogo =
        req.body.removeLogo === 'true' || req.body.removeLogo === true;

      let nextLogoUrl = existing.logoUrl;
      if (logoFile) {
        nextLogoUrl = `/uploads/${logoFile.filename}`;
      } else if (removeLogo) {
        nextLogoUrl = null;
      }

      const incomingProducts =
        req.body.products !== undefined
          ? productsArraySchema.parse(
              parseJsonField<unknown>(req.body.products, [])
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
            deliveryDates,
            notes: cleanNotes,
          },
        });

        if (incomingProducts && Array.isArray(incomingProducts)) {
          const existingIds = new Set(existing.products.map((p) => p.id));
          const keptIds = new Set(
            incomingProducts
              .map((p) => p.id)
              .filter((id): id is string => Boolean(id && existingIds.has(id)))
          );

          const toDeleteIds = existing.products
            .filter((p) => !keptIds.has(p.id))
            .map((p) => p.id);

          if (toDeleteIds.length > 0) {
            await tx.product.deleteMany({
              where: {
                id: { in: toDeleteIds },
                catalogId: existing.id,
              },
            });
          }

          for (let index = 0; index < incomingProducts.length; index++) {
            const p = incomingProducts[index];
            const existingProduct = p.id
              ? existing.products.find((ep) => ep.id === p.id)
              : undefined;
            const uploadedFile = p.imageField
              ? fileByField.get(p.imageField)
              : undefined;
            const imageUrl = uploadedFile
              ? `/uploads/${uploadedFile.filename}`
              : p.imageUrl !== undefined
                ? p.imageUrl
                : existingProduct?.imageUrl ?? null;

            const payload = {
              name: p.name,
              description: p.description,
              priceCents: p.priceCents,
              imageUrl,
              orderIndex: p.orderIndex ?? index,
              available: parseBoolean(p.available, true),
            };

            if (p.id && existingIds.has(p.id)) {
              await tx.product.update({
                where: { id: p.id },
                data: payload,
              });
            } else {
              await tx.product.create({
                data: {
                  ...payload,
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
            renewalCount: true,
            storeName: true,
            logoUrl: true,
            themeColor: true,
            whatsapp: true,
            pixKey: true,
            depositPct: true,
            deliveryDates: true,
            notes: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            products: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        });
      });

      res.json(updatedCatalog);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
