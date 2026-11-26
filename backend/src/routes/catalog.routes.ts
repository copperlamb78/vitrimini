import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { upload } from '../config/upload.js';
import {
  cancelCardSubscriptionHandler,
  createCardSubscriptionHandler,
  createCatalogHandler,
  getCatalogByIdHandler,
  getCatalogByManageTokenHandler,
  getCatalogStatusHandler,
  getMyCatalogsHandler,
  getPublicStoreHandler,
  mockPayCatalogHandler,
  pixWebhookHandler,
  renewCatalogHandler,
  resolveCatalogTokenHandler,
  syncCardSubscriptionHandler,
  updateCatalogByIdHandler,
  updateCatalogByManageTokenHandler,
} from '../controllers/catalog.controller.js';
import { requireAuth, requireMerchant } from '../middlewares/auth.js';
import {
  merchantReadRateLimiter,
  pixWebhookRateLimiter,
  userOrIpKeyGenerator,
} from '../middlewares/rateLimitGuard.js';

const router = Router();

const catalogWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
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
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error:
      'Muitas consultas de pagamento em sequência. Aguarde alguns instantes e tente novamente.',
  },
});

// POST /api/catalogs (Aberta a qualquer usuário autenticado)
router.post(
  '/catalogs',
  requireAuth,
  catalogWriteRateLimiter,
  upload.any(),
  createCatalogHandler
);

// POST /api/catalogs/:id/renew (Exclusiva de lojista)
router.post(
  '/catalogs/:id/renew',
  requireMerchant,
  catalogWriteRateLimiter,
  renewCatalogHandler
);

// POST /api/catalogs/:id/subscription/card (Exclusiva de lojista)
router.post(
  '/catalogs/:id/subscription/card',
  requireMerchant,
  catalogWriteRateLimiter,
  createCardSubscriptionHandler
);

// POST /api/catalogs/:id/subscription/cancel (Exclusiva de lojista)
router.post(
  '/catalogs/:id/subscription/cancel',
  requireMerchant,
  catalogWriteRateLimiter,
  cancelCardSubscriptionHandler
);

// POST /api/catalogs/:id/subscription/sync (Exclusiva de lojista)
router.post(
  '/catalogs/:id/subscription/sync',
  requireMerchant,
  catalogWriteRateLimiter,
  syncCardSubscriptionHandler
);

// GET /api/my-catalogs (Aberta a qualquer usuário autenticado)
router.get(
  '/my-catalogs',
  requireAuth,
  merchantReadRateLimiter,
  getMyCatalogsHandler
);

// GET /api/catalogs/:id/status (Exclusiva de lojista)
router.get(
  '/catalogs/:id/status',
  requireMerchant,
  catalogStatusRateLimiter,
  getCatalogStatusHandler
);

// POST /api/catalogs/:id/mock-pay (Exclusiva de lojista, apenas quando MOCK_PIX=true)
router.post(
  '/catalogs/:id/mock-pay',
  requireMerchant,
  catalogWriteRateLimiter,
  mockPayCatalogHandler
);

// POST /api/webhooks/pix (Webhook público com validação de assinatura HMAC)
router.post('/webhooks/pix', pixWebhookRateLimiter, pixWebhookHandler);

// GET /api/store/:slug (Vitrine pública)
router.get('/store/:slug', publicStoreRateLimiter, getPublicStoreHandler);

// GET /api/catalogs/resolve-token/:editToken (Exclusiva de lojista — ANTES de /catalogs/:id)
router.get(
  '/catalogs/resolve-token/:editToken',
  requireMerchant,
  merchantReadRateLimiter,
  resolveCatalogTokenHandler
);

// GET /api/catalogs/:id (Exclusiva de lojista)
router.get(
  '/catalogs/:id',
  requireMerchant,
  merchantReadRateLimiter,
  getCatalogByIdHandler
);

// GET /api/manage/:editToken (Exclusiva de lojista)
router.get(
  '/manage/:editToken',
  requireMerchant,
  merchantReadRateLimiter,
  getCatalogByManageTokenHandler
);

// PUT /api/catalogs/:id (Exclusiva de lojista)
router.put(
  '/catalogs/:id',
  requireMerchant,
  catalogWriteRateLimiter,
  upload.any(),
  updateCatalogByIdHandler
);

// PUT /api/manage/:editToken (Exclusiva de lojista)
router.put(
  '/manage/:editToken',
  requireMerchant,
  catalogWriteRateLimiter,
  upload.any(),
  updateCatalogByManageTokenHandler
);

export default router;
