import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../middlewares/errorHandler.js';
import { isAllowedOrigin, requireAuth } from '../middlewares/auth.js';
import { userOrIpKeyGenerator } from '../middlewares/rateLimitGuard.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
  },
});

const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas solicitações de recuperação de senha. Aguarde alguns minutos e tente novamente.',
  },
});

const sessionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error:
      'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
  },
});

function rejectUntrustedOrigin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (origin !== undefined && !isAllowedOrigin(origin)) {
    next(new AppError(403, 'Origem não autorizada.'));
    return;
  }
  next();
}

// POST /api/auth/register
router.post('/register', authRateLimiter, authController.register);

// POST /api/auth/login
router.post('/login', authRateLimiter, authController.login);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  authController.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  authController.resetPassword
);

// POST /api/auth/refresh (Rotação obrigatória + detecção de reuso)
router.post(
  '/refresh',
  rejectUntrustedOrigin,
  sessionRateLimiter,
  authController.refresh
);

// POST /api/auth/logout
router.post(
  '/logout',
  rejectUntrustedOrigin,
  sessionRateLimiter,
  authController.logout
);

// GET /api/auth/me
router.get('/me', sessionRateLimiter, requireAuth, authController.me);

export default router;
