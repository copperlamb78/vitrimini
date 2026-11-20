import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET não configurado ou muito curto em produção.');
  }
  return secret || 'vitrimini-default-jwt-secret-2026';
}

export function validateJwtSecretConfig(): void {
  getJwtSecret();
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
    { expiresIn: '15m' }
  );
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'Faça login na sua conta para continuar.'));
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    next(new AppError(401, 'Sessão expirada. Faça login novamente.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      phone: decoded.phone,
    };
    next();
  } catch {
    next(new AppError(401, 'Sessão inválida ou expirada. Faça login novamente.'));
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
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
    return decoded.id || null;
  } catch {
    return null;
  }
}

function getAllowedAdminEmails(): Set<string> {
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
  requireAuth(req, res, (authErr?: unknown) => {
    if (authErr) {
      next(authErr);
      return;
    }

    const email = req.user?.email?.trim().toLowerCase();
    const allowedAdmins = getAllowedAdminEmails();

    if (!email || allowedAdmins.size === 0 || !allowedAdmins.has(email)) {
      next(new AppError(403, 'Acesso restrito a administradores.'));
      return;
    }

    next();
  });
}
