import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { upload } from '../config/upload.js';
import { generateUniqueSlug } from '../utils/slug.js';
import {
  createPixPayment,
  isMockPixEnabled,
  verifyMercadoPagoPayment,
} from '../services/payment.service.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';

const router = Router();

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const RECOVER_WINDOW_MS = 5 * 60 * 1000;
const RECOVER_MAX_ATTEMPTS = 10;
const recoverAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

function checkRecoverRateLimit(ip: string): void {
  const now = Date.now();
  const record = recoverAttemptsByIp.get(ip);
  if (!record || now > record.resetAt) {
    recoverAttemptsByIp.set(ip, { count: 1, resetAt: now + RECOVER_WINDOW_MS });
    return;
  }
  if (record.count >= RECOVER_MAX_ATTEMPTS) {
    throw new AppError(
      429,
      'Muitas tentativas de recuperação. Aguarde alguns minutos e tente novamente.'
    );
  }
  record.count += 1;
}
const ALLOWED_THEMES = new Set([
  'rose',
  'red',
  'amber',
  'emerald',
  'purple',
  'zinc',
]);

interface IncomingProduct {
  id?: string;
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  imageField?: string;
  orderIndex?: number;
  available?: boolean;
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
    }
  }
  return value as T;
}

function sanitizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, '');
}

function normalizeThemeColor(raw: unknown): string {
  if (typeof raw === 'string' && ALLOWED_THEMES.has(raw.trim())) {
    return raw.trim();
  }
  return 'rose';
}

// POST /api/catalogs
router.post(
  '/catalogs',
  upload.any(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeName, whatsapp, pixKey, notes } = req.body;
      const depositPctRaw = req.body.depositPct;
      const depositPct = depositPctRaw !== undefined ? Number(depositPctRaw) : 50;
      const themeColor = normalizeThemeColor(req.body.themeColor);

      if (!storeName || typeof storeName !== 'string' || !storeName.trim()) {
        throw new AppError(400, 'Informe o nome do estabelecimento e tente novamente.');
      }

      const cleanWhatsapp = sanitizeWhatsapp(String(whatsapp || ''));
      if (cleanWhatsapp.length < 10) {
        throw new AppError(400, 'Informe um WhatsApp válido com DDD e tente novamente.');
      }

      if (![0, 50, 100].includes(depositPct)) {
        throw new AppError(400, FRIENDLY_ERRORS.VALIDATION);
      }

      const deliveryDates = parseJsonField<string[]>(req.body.deliveryDates, [])
        .map((d) => String(d).trim())
        .filter(Boolean);

      const incomingProducts = parseJsonField<IncomingProduct[]>(req.body.products, []);
      if (!Array.isArray(incomingProducts) || incomingProducts.length === 0) {
        throw new AppError(400, 'Adicione pelo menos um produto válido e tente novamente.');
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const fileByField = new Map<string, Express.Multer.File>();
      for (const file of files) {
        fileByField.set(file.fieldname, file);
      }

      const logoFile = fileByField.get('logo');
      const logoUrl = logoFile ? `/uploads/${logoFile.filename}` : null;

      const productsData = incomingProducts.map((p, index) => {
        const uploadedFile = p.imageField ? fileByField.get(p.imageField) : undefined;
        const imageUrl = uploadedFile
          ? `/uploads/${uploadedFile.filename}`
          : p.imageUrl || null;

        return {
          name: String(p.name || '').trim(),
          description: p.description ? String(p.description).trim() : null,
          priceCents: Math.max(0, Math.round(Number(p.priceCents) || 0)),
          imageUrl,
          orderIndex: p.orderIndex ?? index,
          available: p.available !== undefined ? Boolean(p.available) : true,
        };
      });

      if (productsData.some((p) => !p.name)) {
        throw new AppError(400, 'Todos os produtos precisam ter um nome preenchido.');
      }

      const slug = await generateUniqueSlug(storeName.trim());

      const catalog = await prisma.catalog.create({
        data: {
          slug,
          status: 'DRAFT',
          storeName: storeName.trim(),
          logoUrl,
          themeColor,
          whatsapp: cleanWhatsapp,
          pixKey: pixKey ? String(pixKey).trim() : null,
          depositPct,
          deliveryDates,
          notes: notes ? String(notes).trim() : null,
          products: {
            create: productsData,
          },
        },
      });

      const payment = await createPixPayment({
        catalogId: catalog.id,
        storeName: catalog.storeName,
      });

      await prisma.catalog.update({
        where: { id: catalog.id },
        data: { paymentId: payment.paymentId },
      });

      res.status(201).json({
        catalogId: catalog.id,
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

// POST /api/catalogs/recover
router.post(
  '/catalogs/recover',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIp = String(req.ip || req.socket.remoteAddress || 'unknown');
      checkRecoverRateLimit(clientIp);

      const rawWhatsapp = String(req.body?.whatsapp || '');
      const rawVerifier = String(
        req.body?.verifier ?? req.body?.pixKey ?? req.body?.storeName ?? ''
      ).trim();

      const cleanWhatsapp = sanitizeWhatsapp(rawWhatsapp);
      if (cleanWhatsapp.length < 10 || rawVerifier.length < 2) {
        throw new AppError(
          400,
          'Informe o WhatsApp e a Chave Pix (ou nome exato da loja) para recuperar seus links.'
        );
      }

      const whatsappCandidates = Array.from(
        new Set([
          cleanWhatsapp,
          cleanWhatsapp.startsWith('55')
            ? cleanWhatsapp.slice(2)
            : `55${cleanWhatsapp}`,
        ])
      );

      const activeCatalogs = await prisma.catalog.findMany({
        where: {
          status: 'ACTIVE',
          whatsapp: { in: whatsappCandidates },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          storeName: true,
          slug: true,
          editToken: true,
          pixKey: true,
          expiresAt: true,
        },
      });

      const verifierLower = rawVerifier.toLowerCase();
      const verifierDigits = sanitizeWhatsapp(rawVerifier);

      const matched = activeCatalogs.filter((cat) => {
        const storeMatch = cat.storeName.trim().toLowerCase() === verifierLower;
        if (storeMatch) return true;

        if (cat.pixKey) {
          const pixLower = cat.pixKey.trim().toLowerCase();
          if (pixLower === verifierLower) return true;

          const pixDigits = sanitizeWhatsapp(cat.pixKey);
          if (verifierDigits.length >= 9 && pixDigits === verifierDigits) {
            return true;
          }
        }

        return false;
      });

      if (matched.length === 0) {
        throw new AppError(
          404,
          'Nenhuma vitrine ativa encontrada com esses dados. Confira o WhatsApp e a Chave Pix (ou nome exato da loja).'
        );
      }

      res.json({
        catalogs: matched.map((c) => ({
          catalogId: c.id,
          storeName: c.storeName,
          slug: c.slug,
          editToken: c.editToken,
          expiresAt: c.expiresAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/catalogs/:id/status
router.get(
  '/catalogs/:id/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const catalog = await prisma.catalog.findUnique({
        where: { id },
        select: {
          status: true,
          slug: true,
          editToken: true,
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

// POST /api/catalogs/:id/mock-pay (apenas quando MOCK_PIX=true)
router.post(
  '/catalogs/:id/mock-pay',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isMockPixEnabled()) {
        throw new AppError(403, 'Pagamento simulado indisponível neste ambiente.');
      }

      const id = String(req.params.id);
      const existing = await prisma.catalog.findUnique({ where: { id } });

      if (!existing) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
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
        },
      });

      res.json(updated);
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
      const mpPaymentId = body?.data?.id || req.query['data.id'];

      let targetCatalogId: string | undefined = body.catalogId;
      let targetPaymentId: string | undefined = body.paymentId;
      let approved = body.status === 'approved';

      if (mpPaymentId) {
        const verification = await verifyMercadoPagoPayment(String(mpPaymentId));
        approved = verification.approved;
        targetPaymentId = String(mpPaymentId);
        if (verification.catalogId) {
          targetCatalogId = verification.catalogId;
        }
      }

      if (approved && (targetCatalogId || targetPaymentId)) {
        const catalog = targetCatalogId
          ? await prisma.catalog.findUnique({ where: { id: targetCatalogId } })
          : await prisma.catalog.findFirst({ where: { paymentId: targetPaymentId } });

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
      const slug = String(req.params.slug);
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
        if (catalog.status !== 'ACTIVE') {
          throw new AppError(403, 'Esta vitrine ainda não está ativa.');
        }

        if (catalog.expiresAt && catalog.expiresAt < new Date()) {
          await prisma.catalog.update({
            where: { id: catalog.id },
            data: { status: 'EXPIRED' },
          });
          throw new AppError(403, FRIENDLY_ERRORS.NOT_FOUND);
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
      const editToken = String(req.params.editToken);
      const catalog = await prisma.catalog.findUnique({
        where: { editToken },
        include: {
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
      const editToken = String(req.params.editToken);
      const existing = await prisma.catalog.findUnique({
        where: { editToken },
        include: { products: true },
      });

      if (!existing) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      const { storeName, whatsapp, pixKey, notes } = req.body;
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

      const deliveryDates =
        req.body.deliveryDates !== undefined
          ? parseJsonField<string[]>(req.body.deliveryDates, existing.deliveryDates)
              .map((d) => String(d).trim())
              .filter(Boolean)
          : existing.deliveryDates;

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
          ? parseJsonField<IncomingProduct[]>(req.body.products, [])
          : undefined;

      const updatedCatalog = await prisma.$transaction(async (tx) => {
        await tx.catalog.update({
          where: { id: existing.id },
          data: {
            storeName: storeName ? String(storeName).trim() : existing.storeName,
            logoUrl: nextLogoUrl,
            themeColor,
            whatsapp: whatsapp
              ? sanitizeWhatsapp(String(whatsapp))
              : existing.whatsapp,
            pixKey:
              pixKey !== undefined
                ? pixKey
                  ? String(pixKey).trim()
                  : null
                : existing.pixKey,
            depositPct,
            deliveryDates,
            notes:
              notes !== undefined
                ? notes
                  ? String(notes).trim()
                  : null
                : existing.notes,
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
            const uploadedFile = p.imageField ? fileByField.get(p.imageField) : undefined;
            const imageUrl = uploadedFile
              ? `/uploads/${uploadedFile.filename}`
              : p.imageUrl ?? null;

            const payload = {
              name: String(p.name || '').trim(),
              description: p.description ? String(p.description).trim() : null,
              priceCents: Math.max(0, Math.round(Number(p.priceCents) || 0)),
              imageUrl,
              orderIndex: p.orderIndex ?? index,
              available: p.available !== undefined ? Boolean(p.available) : true,
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
          include: {
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
