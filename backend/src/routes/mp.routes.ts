import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middlewares/auth.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import { encryptSecret, verifyMpOAuthState } from '../utils/crypto.js';
import {
  buildMpAuthorizationUrl,
  exchangeMpCodeForTokens,
  fetchMerchantMpPayment,
  hasProFeatures,
} from '../services/mpOAuth.service.js';
import { getFrontendBaseUrl } from '../services/email.service.js';

const router = Router();
const uuidParamSchema = z.string().uuid('Código inválido.');

// 1. GET /api/catalogs/:id/integrations/mercadopago/connect
router.get(
  '/catalogs/:id/integrations/mercadopago/connect',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalogId = uuidParamSchema.parse(req.params.id);
      const catalog = await prisma.catalog.findUnique({
        where: { id: catalogId },
        select: {
          id: true,
          userId: true,
          status: true,
          planType: true,
          isTrial: true,
          expiresAt: true,
        },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== req.user!.id) {
        throw new AppError(403, 'Você não tem permissão para alterar esta vitrine.');
      }

      if (!hasProFeatures(catalog)) {
        throw new AppError(
          403,
          'O pagamento online automático faz parte do Plano Pro (ou dos 15 dias grátis).'
        );
      }

      const authUrl = buildMpAuthorizationUrl(catalog.id, req.user!.id);
      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  }
);

// 2. GET /api/integrations/mercadopago/callback
router.get(
  '/integrations/mercadopago/callback',
  async (req: Request, res: Response) => {
    const frontendUrl = getFrontendBaseUrl();
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';

    const verified = verifyMpOAuthState(state);
    if (!verified || !code) {
      res.redirect(`${frontendUrl}/minhas-vitrines?mp=error`);
      return;
    }

    try {
      const catalog = await prisma.catalog.findUnique({
        where: { id: verified.catalogId },
        select: { id: true, userId: true },
      });

      if (!catalog || catalog.userId !== verified.userId) {
        res.redirect(`${frontendUrl}/minhas-vitrines?mp=error`);
        return;
      }

      const tokens = await exchangeMpCodeForTokens(code);
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      await prisma.catalog.update({
        where: { id: catalog.id },
        data: {
          mpUserId: tokens.user_id ? String(tokens.user_id) : 'connected',
          mpAccessToken: encryptSecret(tokens.access_token),
          mpRefreshToken: tokens.refresh_token
            ? encryptSecret(tokens.refresh_token)
            : null,
          mpTokenExpiresAt: expiresAt,
          onlinePaymentEnabled: true,
        },
      });

      res.redirect(`${frontendUrl}/painel/${catalog.id}?mp=connected`);
    } catch (err) {
      console.error('[MP OAuth Callback Error]:', err);
      res.redirect(`${frontendUrl}/painel/${verified.catalogId}?mp=error`);
    }
  }
);

// 3. PATCH /api/catalogs/:id/integrations/mercadopago/toggle
router.patch(
  '/catalogs/:id/integrations/mercadopago/toggle',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalogId = uuidParamSchema.parse(req.params.id);
      const enabled = Boolean(req.body?.enabled);

      const catalog = await prisma.catalog.findUnique({
        where: { id: catalogId },
        select: {
          id: true,
          userId: true,
          status: true,
          planType: true,
          isTrial: true,
          expiresAt: true,
          mpAccessToken: true,
        },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== req.user!.id) {
        throw new AppError(403, 'Você não tem permissão para alterar esta vitrine.');
      }

      if (enabled && !hasProFeatures(catalog)) {
        throw new AppError(
          403,
          'O pagamento online automático faz parte do Plano Pro.'
        );
      }

      if (enabled && !catalog.mpAccessToken) {
        throw new AppError(
          400,
          'Conecte sua conta Mercado Pago antes de ativar o pagamento online.'
        );
      }

      const updated = await prisma.catalog.update({
        where: { id: catalog.id },
        data: { onlinePaymentEnabled: enabled },
        select: { onlinePaymentEnabled: true },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// 4. DELETE /api/catalogs/:id/integrations/mercadopago
router.delete(
  '/catalogs/:id/integrations/mercadopago',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalogId = uuidParamSchema.parse(req.params.id);
      const catalog = await prisma.catalog.findUnique({
        where: { id: catalogId },
        select: { id: true, userId: true },
      });

      if (!catalog) {
        throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
      }

      if (catalog.userId !== req.user!.id) {
        throw new AppError(403, 'Você não tem permissão para alterar esta vitrine.');
      }

      await prisma.catalog.update({
        where: { id: catalog.id },
        data: {
          mpUserId: null,
          mpAccessToken: null,
          mpRefreshToken: null,
          mpTokenExpiresAt: null,
          onlinePaymentEnabled: false,
        },
      });

      res.json({ disconnected: true });
    } catch (error) {
      next(error);
    }
  }
);

// 5. POST /api/webhooks/mercadopago/orders — Baixa automática de pedidos online
router.post(
  '/webhooks/mercadopago/orders',
  async (req: Request, res: Response) => {
    try {
      const topic = String(req.body?.type || req.body?.topic || req.query.topic || '').toLowerCase();
      const rawPaymentId =
        req.body?.data?.id ?? req.query['data.id'] ?? req.query.id ?? req.body?.id;

      if (!rawPaymentId || (topic && topic !== 'payment')) {
        res.status(200).json({ received: true });
        return;
      }

      const mpPaymentId = String(rawPaymentId).trim();
      const queryCatalogId =
        typeof req.query.catalogId === 'string' ? req.query.catalogId.trim() : '';

      let catalog = queryCatalogId
        ? await prisma.catalog.findUnique({
            where: { id: queryCatalogId },
            select: {
              id: true,
              mpAccessToken: true,
              mpRefreshToken: true,
              mpTokenExpiresAt: true,
            },
          })
        : null;

      if (!catalog) {
        const orderByPayment = await prisma.order.findFirst({
          where: { mpPaymentId },
          select: {
            catalog: {
              select: {
                id: true,
                mpAccessToken: true,
                mpRefreshToken: true,
                mpTokenExpiresAt: true,
              },
            },
          },
        });
        catalog = orderByPayment?.catalog || null;
      }

      if (!catalog || !catalog.mpAccessToken) {
        res.status(200).json({ received: true });
        return;
      }

      const mpPayment = await fetchMerchantMpPayment(catalog, mpPaymentId);
      const orderId = mpPayment.external_reference?.trim();
      if (!orderId) {
        res.status(200).json({ received: true });
        return;
      }

      if (mpPayment.status === 'approved') {
        await prisma.order.updateMany({
          where: {
            id: orderId,
            catalogId: catalog.id,
            paymentStatus: { not: 'PAID' },
          },
          data: {
            paymentStatus: 'PAID',
            mpPaymentId,
          },
        });
      } else if (
        mpPayment.status === 'cancelled' ||
        mpPayment.status === 'rejected'
      ) {
        await prisma.order.updateMany({
          where: {
            id: orderId,
            catalogId: catalog.id,
            paymentStatus: 'PENDING',
          },
          data: {
            paymentStatus: 'CANCELLED',
            mpPaymentId,
          },
        });
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('[MP Order Webhook Error]:', err);
      res.status(200).json({ received: true });
    }
  }
);

export default router;
