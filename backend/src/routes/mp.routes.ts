import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireMerchant } from '../middlewares/auth.js';
import { userOrIpKeyGenerator } from '../middlewares/rateLimitGuard.js';
import {
  connectMpHandler,
  disconnectMpHandler,
  mpCallbackHandler,
  mpOrdersWebhookHandler,
  toggleMpHandler,
} from '../controllers/mp.controller.js';

const router = Router();

const mpOAuthRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error: 'Muitas solicitações ao Mercado Pago. Aguarde alguns instantes.',
  },
});

const mpCallbackRateLimiter = rateLimit({
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

// 1. GET /api/catalogs/:id/integrations/mercadopago/connect
router.get(
  '/catalogs/:id/integrations/mercadopago/connect',
  mpOAuthRateLimiter,
  requireMerchant,
  connectMpHandler
);

// 2. GET /api/integrations/mercadopago/callback
router.get(
  '/integrations/mercadopago/callback',
  mpCallbackRateLimiter,
  mpCallbackHandler
);

// 3. PATCH /api/catalogs/:id/integrations/mercadopago/toggle
router.patch(
  '/catalogs/:id/integrations/mercadopago/toggle',
  mpOAuthRateLimiter,
  requireMerchant,
  toggleMpHandler
);

// 4. DELETE /api/catalogs/:id/integrations/mercadopago
router.delete(
  '/catalogs/:id/integrations/mercadopago',
  mpOAuthRateLimiter,
  requireMerchant,
  disconnectMpHandler
);

// 5. POST /api/webhooks/mercadopago/orders — Baixa automática de pedidos online
router.post(
  '/webhooks/mercadopago/orders',
  mpWebhookRateLimiter,
  mpOrdersWebhookHandler
);

export default router;
