import crypto from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  getAllowedAdminEmails,
  isAllowedOrigin,
  requireAuth,
  signAuthToken,
  type AuthUserPayload,
} from '../middlewares/auth.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../utils/validation.js';
import {
  getFrontendBaseUrl,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../services/email.service.js';

const router = Router();

const CURRENT_TERMS_VERSION = '1.0-2026-11';
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const REFRESH_COOKIE_NAME = 'vitrimini_refresh_token';

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getRefreshCookieOptions(maxAge?: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api/auth',
    ...(isProd ? { domain: '.vitrimini.com.br' } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

function parseRefreshCookie(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

async function issueSessionTokens(res: Response, user: AuthUserPayload) {
  const accessToken = signAuthToken(user);
  const rawRefresh = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  res.cookie(
    REFRESH_COOKIE_NAME,
    rawRefresh,
    getRefreshCookieOptions(REFRESH_TOKEN_TTL_MS)
  );

  return accessToken;
}

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
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
  },
});

const FORGOT_PASSWORD_COOLDOWN_MS = 2 * 60 * 1000;
const forgotPasswordCooldowns = new Map<string, number>();

function pruneExpiredForgotPasswordCooldowns(now: number): void {
  for (const [key, expiresAt] of forgotPasswordCooldowns.entries()) {
    if (expiresAt <= now) {
      forgotPasswordCooldowns.delete(key);
    }
  }
}

function hashResetToken(rawToken: string): string {
  return hashToken(rawToken);
}

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
router.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.parse(req.body);
      const normalizedEmail = parsed.email.trim().toLowerCase();

      if (getAllowedAdminEmails().has(normalizedEmail)) {
        throw new AppError(
          403,
          'Este endereço de e-mail não está disponível para auto-cadastro.'
        );
      }

      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (existing) {
        throw new AppError(
          400,
          'Este e-mail já possui uma conta cadastrada. Clique em Entrar.'
        );
      }

      const passwordHash = await bcrypt.hash(parsed.password.trim(), 10);

      const now = new Date();
      const user = await prisma.user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          passwordHash,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          termsVersion: CURRENT_TERMS_VERSION,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          hasUsedTrial: true,
        },
      });

      const token = await issueSessionTokens(res, user);

      // Dispara e-mail de boas-vindas em background sem bloquear a resposta do cadastro
      void sendWelcomeEmail({
        to: user.email,
        name: user.name,
      }).catch((mailErr) => {
        console.error('[Welcome Email Error]:', mailErr);
      });

      res.status(201).json({
        token,
        user: {
          ...user,
          canUseTrial: !user.hasUsedTrial,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: parsed.email },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          hasUsedTrial: true,
          passwordHash: true,
          _count: {
            select: {
              catalogs: true,
              orders: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError(401, 'E-mail ou senha incorretos.');
      }

      const valid = await bcrypt.compare(
        parsed.password.trim(),
        user.passwordHash
      );
      if (!valid) {
        throw new AppError(401, 'E-mail ou senha incorretos.');
      }

      const publicUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        hasUsedTrial: user.hasUsedTrial,
        canUseTrial: !user.hasUsedTrial,
        _count: user._count,
      };

      const token = await issueSessionTokens(res, publicUser);

      res.json({ token, user: publicUser });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const normalizedEmail = email.trim().toLowerCase();
      const now = Date.now();
      pruneExpiredForgotPasswordCooldowns(now);

      const cooldownUntil = forgotPasswordCooldowns.get(normalizedEmail);
      if (cooldownUntil && cooldownUntil > now) {
        res.json({
          message:
            'Se este e-mail estiver cadastrado, enviamos as instruções para redefinir sua senha.',
        });
        return;
      }

      if (forgotPasswordCooldowns.size >= 1000) {
        pruneExpiredForgotPasswordCooldowns(now);
      }
      forgotPasswordCooldowns.set(
        normalizedEmail,
        now + FORGOT_PASSWORD_COOLDOWN_MS
      );

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (user) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: expiresAt,
          },
        });

        const frontendUrl = getFrontendBaseUrl();
        const resetUrl = `${frontendUrl}/redefinir-senha?token=${rawToken}`;

        try {
          await sendPasswordResetEmail({
            to: user.email,
            name: user.name,
            resetUrl,
          });
        } catch (mailErr) {
          console.error('[Password Reset Email Error]:', mailErr);
        }
      }

      res.json({
        message:
          'Se este e-mail estiver cadastrado, enviamos as instruções para redefinir sua senha.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  passwordResetRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const tokenHash = hashResetToken(token);

      const user = await prisma.user.findFirst({
        where: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        throw new AppError(
          400,
          'Este link de redefinição é inválido ou expirou. Solicite um novo link.'
        );
      }

      const newPasswordHash = await bcrypt.hash(password.trim(), 10);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newPasswordHash,
            passwordResetTokenHash: null,
            passwordResetExpiresAt: null,
          },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      // Dispara confirmação de senha alterada em background
      void sendPasswordChangedEmail({
        to: user.email,
        name: user.name,
        changedAt: new Date(),
      }).catch((mailErr) => {
        console.error('[Password Changed Email Error]:', mailErr);
      });

      res.json({
        message: 'Sua senha foi redefinida com sucesso! Você já pode entrar.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/refresh (Rotação obrigatória + detecção de reuso)
router.post(
  '/refresh',
  rejectUntrustedOrigin,
  sessionRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawRefresh = parseRefreshCookie(req);
      if (!rawRefresh) {
        throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
      }

      const tokenHash = hashToken(rawRefresh);
      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              hasUsedTrial: true,
            },
          },
        },
      });

      if (!stored) {
        res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
        throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
      }

      // Se um token já revogado for reutilizado, revoga todas as sessões do usuário
      if (stored.revokedAt !== null) {
        await prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
        throw new AppError(
          401,
          'Por segurança, você foi desconectado. Entre novamente.'
        );
      }

      if (stored.expiresAt <= new Date()) {
        await prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
        res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
        throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
      }

      const nextRawRefresh = crypto.randomBytes(48).toString('hex');
      const nextTokenHash = hashToken(nextRawRefresh);
      const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      const rotated = await prisma.$transaction(async (tx) => {
        const revoked = await tx.refreshToken.updateMany({
          where: { id: stored.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (revoked.count === 0) return false;

        await tx.refreshToken.create({
          data: {
            tokenHash: nextTokenHash,
            userId: stored.userId,
            expiresAt: nextExpiresAt,
          },
        });
        return true;
      });

      if (!rotated) {
        res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
        throw new AppError(401, 'Sua conexão expirou. Entre novamente.');
      }

      const accessToken = signAuthToken(stored.user);
      res.cookie(
        REFRESH_COOKIE_NAME,
        nextRawRefresh,
        getRefreshCookieOptions(REFRESH_TOKEN_TTL_MS)
      );

      res.json({
        token: accessToken,
        user: {
          ...stored.user,
          canUseTrial: !stored.user.hasUsedTrial,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
router.post(
  '/logout',
  rejectUntrustedOrigin,
  sessionRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawRefresh = parseRefreshCookie(req);
      if (rawRefresh) {
        await prisma.refreshToken.updateMany({
          where: {
            tokenHash: hashToken(rawRefresh),
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }

      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          hasUsedTrial: true,
          createdAt: true,
          _count: {
            select: {
              catalogs: true,
              payments: true,
              orders: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError(401, 'Conta não encontrada. Entre novamente.');
      }

      res.json({
        user: {
          ...user,
          canUseTrial: !user.hasUsedTrial,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
