import crypto from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { requireAuth, signAuthToken } from '../middlewares/auth.js';
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

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

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
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas solicitações de recuperação de senha. Aguarde alguns minutos e tente novamente.',
  },
});

function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// POST /api/auth/register
router.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.parse(req.body);

      const existing = await prisma.user.findUnique({
        where: { email: parsed.email },
        select: { id: true },
      });

      if (existing) {
        throw new AppError(
          400,
          'Este e-mail já possui uma conta cadastrada. Clique em Entrar.'
        );
      }

      const passwordHash = await bcrypt.hash(parsed.password.trim(), 10);

      const user = await prisma.user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });

      const token = signAuthToken(user);

      // Dispara e-mail de boas-vindas em background sem bloquear a resposta do cadastro
      void sendWelcomeEmail({
        to: user.email,
        name: user.name,
      }).catch((mailErr) => {
        console.error('[Welcome Email Error]:', mailErr);
      });

      res.status(201).json({ token, user });
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
          passwordHash: true,
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
      };

      const token = signAuthToken(publicUser);

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

      const user = await prisma.user.findUnique({
        where: { email },
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

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });

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
          createdAt: true,
          _count: {
            select: {
              catalogs: true,
              payments: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError(401, 'Usuário não encontrado. Faça login novamente.');
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
