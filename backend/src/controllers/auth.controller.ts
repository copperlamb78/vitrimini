import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middlewares/errorHandler.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../utils/validation.js';
import * as authService from '../services/auth.service.js';

const REFRESH_COOKIE_NAME = 'vitrimini_refresh_token';

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
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function hasRefreshCookieInRequest(req: Request): boolean {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => {
    const eq = part.indexOf('=');
    return eq !== -1 && part.slice(0, eq).trim() === REFRESH_COOKIE_NAME;
  });
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = registerSchema.parse(req.body);
    const { token, rawRefreshToken, user } = await authService.register(parsed);

    res.cookie(
      REFRESH_COOKIE_NAME,
      rawRefreshToken,
      getRefreshCookieOptions(authService.REFRESH_TOKEN_TTL_MS)
    );

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = loginSchema.parse(req.body);
    const { token, rawRefreshToken, user } = await authService.login(parsed);

    res.cookie(
      REFRESH_COOKIE_NAME,
      rawRefreshToken,
      getRefreshCookieOptions(authService.REFRESH_TOKEN_TTL_MS)
    );

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(parsed);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawRefresh = parseRefreshCookie(req);
  try {
    const { token, rawRefreshToken, user } =
      await authService.refreshSession(rawRefresh);

    res.cookie(
      REFRESH_COOKIE_NAME,
      rawRefreshToken,
      getRefreshCookieOptions(authService.REFRESH_TOKEN_TTL_MS)
    );

    res.json({ token, user });
  } catch (error) {
    if (
      hasRefreshCookieInRequest(req) &&
      error instanceof AppError &&
      error.statusCode === 401
    ) {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
    }
    next(error);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawRefresh = parseRefreshCookie(req);
    await authService.logout(rawRefresh);

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.getMe(req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
