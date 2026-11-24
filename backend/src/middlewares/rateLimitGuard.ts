import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getOptionalAuthUserId } from './auth.js';

export function userOrIpKeyGenerator(req: Request): string {
  const userId = req.user?.id ?? getOptionalAuthUserId(req);
  return userId ? `u:${userId}` : `ip:${ipKeyGenerator(req.ip || '127.0.0.1')}`;
}

interface ScanEntry {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

const MAX_SCAN_ENTRIES = 5_000;
const SCAN_WINDOW_MS = 5 * 60 * 1000;
const SCAN_BLOCK_MS = 5 * 60 * 1000;
const SCAN_LIMIT = 30;
const scanMap = new Map<string, ScanEntry>();

export function scanGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const now = Date.now();
  const key = userOrIpKeyGenerator(req);
  const existing = scanMap.get(key);

  if (existing) {
    if (existing.blockedUntil > now) {
      res.status(429).json({
        error:
          'Muitas tentativas inválidas em sequência. Aguarde alguns minutos e tente novamente.',
      });
      return;
    }

    if (existing.resetAt <= now) {
      scanMap.delete(key);
    }
  }

  res.on('finish', () => {
    if (res.statusCode !== 401 && res.statusCode !== 404) {
      return;
    }

    const finishNow = Date.now();
    const finishKey = userOrIpKeyGenerator(req);
    const current = scanMap.get(finishKey);

    if (current && current.blockedUntil <= finishNow && current.resetAt <= finishNow) {
      scanMap.delete(finishKey);
    }

    const active = scanMap.get(finishKey);
    if (!active) {
      if (scanMap.size >= MAX_SCAN_ENTRIES) {
        const oldestKey = scanMap.keys().next().value;
        if (oldestKey !== undefined) {
          scanMap.delete(oldestKey);
        }
      }
      scanMap.set(finishKey, {
        count: 1,
        resetAt: finishNow + SCAN_WINDOW_MS,
        blockedUntil: 0,
      });
      return;
    }

    active.count += 1;
    if (active.count >= SCAN_LIMIT && active.blockedUntil <= finishNow) {
      active.blockedUntil = finishNow + SCAN_BLOCK_MS;
    }
  });

  next();
}

export const merchantPollingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error:
      'Muitas atualizações seguidas no painel. Aguarde alguns minutos e tente novamente.',
  },
});

export const merchantReadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error:
      'Muitas consultas seguidas no painel. Aguarde alguns minutos e tente novamente.',
  },
});

export const merchantOrderWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    error:
      'Muitas alterações de pedidos em sequência. Aguarde alguns minutos e tente novamente.',
  },
});

export const pixWebhookRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Muitas notificações recebidas em sequência. Aguarde alguns minutos e tente novamente.',
  },
});
