import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../middlewares/auth.js';
import { userOrIpKeyGenerator } from '../middlewares/rateLimitGuard.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

const adminOverviewRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error: 'Muitas consultas ao painel administrativo. Aguarde alguns minutos.',
  },
});

// GET /api/admin/overview (Protegida por requireAdmin)
router.get(
  '/overview',
  adminOverviewRateLimiter,
  requireAdmin,
  adminController.getOverview
);

export default router;
