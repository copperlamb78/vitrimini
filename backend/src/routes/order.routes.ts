import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireMerchant } from '../middlewares/auth.js';
import {
  merchantOrderWriteRateLimiter,
  merchantPollingRateLimiter,
  merchantReadRateLimiter,
  userOrIpKeyGenerator,
} from '../middlewares/rateLimitGuard.js';
import {
  createOrderHandler,
  getCatalogAnalyticsHandler,
  getCatalogOrdersHandler,
  getMyOrdersHandler,
  trackOrderHandler,
  updateOrderStatusHandler,
} from '../controllers/order.controller.js';

const router = Router();

const orderCreationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error:
      'Muitos pedidos enviados em sequência. Aguarde alguns minutos e tente novamente.',
  },
});

const trackingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas consultas de rastreio em sequência. Aguarde alguns minutos e tente novamente.',
  },
});

const myOrdersRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error:
      'Muitas consultas ao histórico de pedidos. Aguarde alguns minutos e tente novamente.',
  },
});

// 1. POST /api/store/:slug/orders — Criação de pedido (exige conta cadastrada)
router.post(
  '/store/:slug/orders',
  orderCreationRateLimiter,
  requireAuth,
  createOrderHandler
);

// 2. GET /api/orders/mine — Histórico de pedidos do usuário autenticado
router.get(
  '/orders/mine',
  myOrdersRateLimiter,
  requireAuth,
  getMyOrdersHandler
);

// 3. GET /api/orders/track/:trackingCode — Acompanhamento público (LGPD-safe)
router.get(
  '/orders/track/:trackingCode',
  trackingRateLimiter,
  trackOrderHandler
);

// 4. GET /api/catalogs/:id/orders — Listagem de pedidos do lojista
router.get(
  '/catalogs/:id/orders',
  merchantPollingRateLimiter,
  requireMerchant,
  getCatalogOrdersHandler
);

// 5. PATCH /api/catalogs/:id/orders/:orderId/status — Atualiza status do pedido
router.patch(
  '/catalogs/:id/orders/:orderId/status',
  merchantOrderWriteRateLimiter,
  requireMerchant,
  updateOrderStatusHandler
);

// 6. GET /api/catalogs/:id/analytics — Financeiro, Produtos Mais Vendidos e Clientes
router.get(
  '/catalogs/:id/analytics',
  merchantReadRateLimiter,
  requireMerchant,
  getCatalogAnalyticsHandler
);

export default router;
