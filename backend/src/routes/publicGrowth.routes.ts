import { Router, Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getOptionalAuthUserId } from '../middlewares/auth.js';
import {
  getActiveAnnouncement,
  validateCouponCode,
} from '../services/adminGrowth.service.js';

const router = Router();

const couponValidateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip || '127.0.0.1')}`,
  message: {
    error: 'Muitas tentativas de validação. Aguarde alguns instantes.',
  },
});

const publicGrowthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip || '127.0.0.1')}`,
  message: {
    error: 'Muitas solicitações seguidas. Aguarde alguns instantes.',
  },
});

// GET /api/coupons/validate?code=FEIRA30
router.get(
  '/coupons/validate',
  couponValidateRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const userId = getOptionalAuthUserId(req);
      const result = await validateCouponCode({ code, userId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/announcements/active
router.get(
  '/announcements/active',
  publicGrowthRateLimiter,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const announcement = await getActiveAnnouncement();
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.json({ announcement });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
