import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { getOptionalAuthUserId } from '../middlewares/auth.js';
import { captureSystemError } from '../services/errorLog.service.js';

const router = Router();

const clientErrorRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `ip:${ipKeyGenerator(req.ip || '127.0.0.1')}`,
  message: {
    error: 'Limite de envio de telemetria atingido.',
  },
});

const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(800),
  stack: z.string().max(3000).optional(),
  route: z.string().trim().max(240).optional(),
  category: z
    .enum([
      'PAYMENT',
      'AUTH',
      'CATALOG',
      'WEBHOOK',
      'EMAIL',
      'DATABASE',
      'RUNTIME',
      'OTHER',
    ])
    .optional(),
  severity: z.enum(['CRITICAL', 'ERROR', 'WARNING']).optional(),
  catalogId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const EXTENSION_NOISE_PATTERNS = [
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /safari-extension:\/\//i,
  /ResizeObserver loop/i,
  /Script error\.?$/i,
];

function isBrowserExtensionNoise(message: string, stack?: string): boolean {
  const combined = `${message}\n${stack || ''}`;
  return EXTENSION_NOISE_PATTERNS.some((pattern) => pattern.test(combined));
}

// POST /api/telemetry/client-error
router.post('/client-error', clientErrorRateLimiter, (req: Request, res: Response) => {
  const parsed = clientErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Payload de telemetria inválido.' });
    return;
  }

  const { message, stack, route, category, severity, catalogId, context } =
    parsed.data;

  if (isBrowserExtensionNoise(message, stack)) {
    res.status(204).send();
    return;
  }

  const userId = getOptionalAuthUserId(req);

  captureSystemError({
    source: 'FRONTEND',
    severity: severity ?? 'ERROR',
    category: category ?? 'RUNTIME',
    message,
    stack,
    route,
    userId,
    catalogId,
    context: {
      ...context,
      userAgent:
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent'].slice(0, 180)
          : undefined,
    },
  });

  res.status(202).json({ received: true });
});

export default router;
