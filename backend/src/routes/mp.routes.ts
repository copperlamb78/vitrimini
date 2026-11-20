import crypto from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middlewares/auth.js';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import { encryptSecret, verifyMpOAuthState } from '../utils/crypto.js';
import {
  buildMpAuthorizationUrl,
  exchangeMpCodeForTokens,
  fetchMerchantMpPayment,
  fetchMpUserId,
  hasProFeatures,
} from '../services/mpOAuth.service.js';
import { getFrontendBaseUrl, sendNewOrderEmail } from '../services/email.service.js';
import {
  isMockPixEnabled,
  validateMercadoPagoWebhookSignature,
} from '../services/payment.service.js';

const router = Router();
const uuidParamSchema = z.string().uuid('Código inválido.');
const MP_OAUTH_NONCE_COOKIE = 'mp_oauth_nonce';

const mpOAuthRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas solicitações ao Mercado Pago. Aguarde alguns instantes.',
  },
});

const mpWebhookRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas notificações de webhook recebidas.',
  },
});

function getMpOAuthNonceCookieOptions(maxAge?: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api/integrations/mercadopago/callback',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

function readCookieValue(req: Request, cookieName: string): string {
  const fromReqCookies = (req as Request & { cookies?: Record<string, unknown> })
    .cookies?.[cookieName];
  if (typeof fromReqCookies === 'string' && fromReqCookies.trim()) {
    return fromReqCookies.trim();
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === cookieName) {
      const rawVal = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(rawVal);
      } catch {
        return rawVal;
      }
    }
  }
  return '';
}

// 1. GET /api/catalogs/:id/integrations/mercadopago/connect
router.get(
  '/catalogs/:id/integrations/mercadopago/connect',
  mpOAuthRateLimiter,
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

      const nonce = crypto.randomBytes(16).toString('hex');
      res.cookie(
        MP_OAUTH_NONCE_COOKIE,
        nonce,
        getMpOAuthNonceCookieOptions(15 * 60 * 1000)
      );

      const authUrl = buildMpAuthorizationUrl(catalog.id, req.user!.id, nonce);
      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  }
);

// 2. GET /api/integrations/mercadopago/callback
router.get(
  '/integrations/mercadopago/callback',
  mpOAuthRateLimiter,
  async (req: Request, res: Response) => {
    const frontendUrl = getFrontendBaseUrl();
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const cookieNonce = readCookieValue(req, MP_OAUTH_NONCE_COOKIE);

    res.clearCookie(MP_OAUTH_NONCE_COOKIE, getMpOAuthNonceCookieOptions());

    const verified = verifyMpOAuthState(state);
    if (!verified || !code || !cookieNonce) {
      res.redirect(`${frontendUrl}/minhas-vitrines?mp=error`);
      return;
    }

    const cookieBuf = Buffer.from(cookieNonce, 'utf8');
    const stateBuf = Buffer.from(verified.nonce, 'utf8');
    if (
      cookieBuf.length !== stateBuf.length ||
      !crypto.timingSafeEqual(cookieBuf, stateBuf)
    ) {
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
      let resolvedMpUserId =
        tokens.user_id !== undefined &&
        tokens.user_id !== null &&
        String(tokens.user_id).trim() !== ''
          ? String(tokens.user_id).trim()
          : null;

      if (!resolvedMpUserId) {
        resolvedMpUserId = await fetchMpUserId(tokens.access_token);
      }

      if (!resolvedMpUserId) {
        console.error(
          '[MP OAuth Callback Error]: Conta Mercado Pago sem user_id identificável.'
        );
        res.redirect(`${frontendUrl}/painel/${catalog.id}?mp=error`);
        return;
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      await prisma.catalog.update({
        where: { id: catalog.id },
        data: {
          mpUserId: resolvedMpUserId,
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
  mpOAuthRateLimiter,
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
  mpOAuthRateLimiter,
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
  mpWebhookRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const rawPaymentId =
        req.query['data.id'] ?? req.body?.data?.id ?? req.query.id ?? req.body?.id;
      const dataIdForSignature =
        rawPaymentId !== undefined && rawPaymentId !== null
          ? String(rawPaymentId).trim()
          : undefined;

      const isProd = process.env.NODE_ENV === 'production';
      if (isProd || !isMockPixEnabled()) {
        const isSignatureValid = validateMercadoPagoWebhookSignature({
          xSignature: req.headers['x-signature'] as string | undefined,
          xRequestId: req.headers['x-request-id'] as string | undefined,
          dataId: dataIdForSignature,
        });
        if (!isSignatureValid) {
          res.status(401).json({ error: 'Assinatura de webhook inválida.' });
          return;
        }
      }

      const topic = String(req.body?.type || req.body?.topic || req.query.topic || '').toLowerCase();

      if (!dataIdForSignature || (topic && topic !== 'payment')) {
        res.status(200).json({ received: true });
        return;
      }

      const mpPaymentId = dataIdForSignature;
      const queryCatalogId =
        typeof req.query.catalogId === 'string' ? req.query.catalogId.trim() : '';

      let catalog = queryCatalogId
        ? await prisma.catalog.findUnique({
            where: { id: queryCatalogId },
            select: {
              id: true,
              mpUserId: true,
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
                mpUserId: true,
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
      if (
        catalog.mpUserId &&
        catalog.mpUserId !== 'connected' &&
        mpPayment.collector_id &&
        String(mpPayment.collector_id) !== catalog.mpUserId
      ) {
        console.warn('[MP Order Webhook] collector_id divergente da vitrine:', {
          catalogId: catalog.id,
          expectedCollectorId: catalog.mpUserId,
          receivedCollectorId: mpPayment.collector_id,
        });
        res.status(200).json({ received: true });
        return;
      }

      const orderId = mpPayment.external_reference?.trim();
      if (!orderId) {
        res.status(200).json({ received: true });
        return;
      }

      const canonicalMpPaymentId = String(mpPayment.id);

      if (
        mpPayment.status === 'approved' &&
        (!mpPayment.status_detail || mpPayment.status_detail === 'accredited')
      ) {
        const targetOrder = await prisma.order.findFirst({
          where: { id: orderId, catalogId: catalog.id },
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            totalCents: true,
            deliveryType: true,
            paymentChannel: true,
            items: {
              select: {
                productName: true,
                unitPriceCents: true,
                quantity: true,
              },
            },
            catalog: {
              select: {
                id: true,
                storeName: true,
                notifyOrderByEmail: true,
                user: {
                  select: { name: true, email: true },
                },
              },
            },
          },
        });

        if (targetOrder) {
          const isCurrencyValid = mpPayment.currency_id === 'BRL';
          const isAmountValid =
            typeof mpPayment.transaction_amount === 'number' &&
            Math.round(mpPayment.transaction_amount * 100) >= targetOrder.totalCents;
          const isChannelValid = targetOrder.paymentChannel === 'MERCADO_PAGO';

          if (!isCurrencyValid || !isAmountValid || !isChannelValid) {
            console.warn('[MP Order Webhook] Pagamento rejeitado na validação:', {
              orderId: targetOrder.id,
              currencyId: mpPayment.currency_id,
              amount: mpPayment.transaction_amount,
              expectedCents: targetOrder.totalCents,
              paymentChannel: targetOrder.paymentChannel,
            });
            res.status(200).json({ received: true });
            return;
          }

          const existingPaidReplay = await prisma.order.findFirst({
            where: {
              mpPaymentId: canonicalMpPaymentId,
              paymentStatus: 'PAID',
              id: { not: targetOrder.id },
            },
            select: { id: true },
          });

          if (existingPaidReplay) {
            console.warn('[MP Order Webhook] Replay de mpPaymentId bloqueado:', {
              mpPaymentId: canonicalMpPaymentId,
              existingOrderId: existingPaidReplay.id,
              targetOrderId: targetOrder.id,
            });
            res.status(200).json({ received: true });
            return;
          }

          const netAmountCents =
            mpPayment.netReceivedCents !== undefined
              ? Math.min(targetOrder.totalCents, mpPayment.netReceivedCents)
              : Math.max(
                  0,
                  targetOrder.totalCents - (mpPayment.feeCentsFromDetails ?? 0)
                );
          const mpFeeCents = Math.max(
            0,
            targetOrder.totalCents - netAmountCents
          );

          const promoted = await prisma.order.updateMany({
            where: {
              id: targetOrder.id,
              catalogId: catalog.id,
              paymentChannel: 'MERCADO_PAGO',
              paymentStatus: { not: 'PAID' },
            },
            data: {
              paymentStatus: 'PAID',
              status: 'PENDING',
              mpPaymentId: canonicalMpPaymentId,
              mpFeeCents,
              netAmountCents,
            },
          });

          if (
            promoted.count > 0 &&
            targetOrder.catalog.notifyOrderByEmail &&
            targetOrder.catalog.user?.email
          ) {
            void sendNewOrderEmail({
              to: targetOrder.catalog.user.email,
              merchantName: targetOrder.catalog.user.name,
              storeName: targetOrder.catalog.storeName,
              catalogId: targetOrder.catalog.id,
              orderNumber: targetOrder.orderNumber,
              customerName: targetOrder.customerName,
              totalCents: targetOrder.totalCents,
              deliveryType: targetOrder.deliveryType,
              items: targetOrder.items,
            }).catch((mailErr) => {
              console.error('[New Order Email Error]:', mailErr);
            });
          }
        }
      } else if (
        mpPayment.status === 'cancelled' ||
        mpPayment.status === 'rejected'
      ) {
        await prisma.order.updateMany({
          where: {
            id: orderId,
            catalogId: catalog.id,
            paymentChannel: 'MERCADO_PAGO',
            paymentStatus: 'PENDING',
          },
          data: {
            paymentStatus: 'CANCELLED',
            mpPaymentId: canonicalMpPaymentId,
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
