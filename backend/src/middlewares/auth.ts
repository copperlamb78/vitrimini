import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET não configurado ou muito curto em produção (mínimo 32 caracteres).'
      );
    }
    return secret;
  }

  if (secret) {
    if (secret.length < 16) {
      throw new Error(
        'JWT_SECRET muito curto em desenvolvimento (mínimo 16 caracteres).'
      );
    }
    return secret;
  }

  return 'vitrimini-default-jwt-secret-2026';
}

export function validateJwtSecretConfig(): void {
  getJwtSecret();
}

export function getAllowedOrigins(): Set<string> {
  const configuredFrontend = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return new Set<string>([
    'https://vitrimini.com.br',
    'https://www.vitrimini.com.br',
    'https://painel.vitrimini.com.br',
    ...configuredFrontend,
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:5173', 'http://127.0.0.1:5173']
      : []),
  ]);
}

export function isAllowedOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/+$/, '');
  return Boolean(normalized) && getAllowedOrigins().has(normalized);
}

export function signAuthToken(user: AuthUserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    },
    getJwtSecret(),
    { expiresIn: '15m', algorithm: 'HS256' }
  );
}

function parseVerifiedAuthPayload(token: string): AuthUserPayload | null {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: ['HS256'],
  });
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    typeof decoded.id !== 'string' ||
    !decoded.id.trim() ||
    typeof decoded.email !== 'string' ||
    !decoded.email.trim()
  ) {
    return null;
  }

  return {
    id: decoded.id,
    email: decoded.email,
    name: typeof decoded.name === 'string' ? decoded.name : '',
    phone: typeof decoded.phone === 'string' ? decoded.phone : '',
  };
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'Entre na sua conta para continuar.'));
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    next(new AppError(401, 'Sua conexão expirou. Entre novamente.'));
    return;
  }

  try {
    const user = parseVerifiedAuthPayload(token);
    if (!user) {
      next(new AppError(401, 'Sua conexão expirou. Entre novamente.'));
      return;
    }
    req.user = user;
    next();
  } catch {
    next(new AppError(401, 'Sua conexão expirou. Entre novamente.'));
  }
}

export function getOptionalAuthUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const user = parseVerifiedAuthPayload(token);
    return user?.id || null;
  } catch {
    return null;
  }
}

export function getAllowedAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, async (authErr?: unknown) => {
    if (authErr) {
      next(authErr);
      return;
    }

    try {
      const email = req.user?.email?.trim().toLowerCase();
      const allowedAdmins = getAllowedAdminEmails();

      if (!email || allowedAdmins.size === 0 || !allowedAdmins.has(email)) {
        next(new AppError(403, 'Acesso restrito a administradores.'));
        return;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true },
      });

      if (
        !dbUser ||
        dbUser.email.trim().toLowerCase() !== email ||
        !allowedAdmins.has(dbUser.email.trim().toLowerCase())
      ) {
        next(new AppError(403, 'Acesso restrito a administradores.'));
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  });
}

const MERCHANT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_MERCHANT_CACHE = 5_000;
const merchantCache = new Map<string, number>();

export function markMerchantCache(userId: string): void {
  if (!userId) return;
  const now = Date.now();

  if (merchantCache.has(userId)) {
    merchantCache.delete(userId);
  } else if (merchantCache.size >= MAX_MERCHANT_CACHE) {
    const oldestKey = merchantCache.keys().next().value;
    if (oldestKey !== undefined) {
      merchantCache.delete(oldestKey);
    }
  }

  merchantCache.set(userId, now + MERCHANT_CACHE_TTL_MS);
}

export function requireMerchant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, async (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }

    try {
      const userId = req.user!.id;
      const now = Date.now();
      const cachedExpiresAt = merchantCache.get(userId);

      if (cachedExpiresAt !== undefined) {
        if (cachedExpiresAt > now) {
          next();
          return;
        }
        merchantCache.delete(userId);
      }

      const catalog = await prisma.catalog.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (catalog) {
        markMerchantCache(userId);
        next();
        return;
      }

      next(
        new AppError(
          403,
          'Área exclusiva para lojistas. Crie sua primeira vitrine para acessar o painel.'
        )
      );
    } catch (dbErr) {
      next(dbErr);
    }
  });
}
