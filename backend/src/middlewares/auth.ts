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
  return process.env.JWT_SECRET?.trim() || 'vitrimini-default-jwt-secret-2026';
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
    { expiresIn: '30d' }
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
