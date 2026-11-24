import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  completeMpOAuthCallback,
  connectMerchantMp,
  disconnectMerchantMp,
  handleMpOrdersWebhook,
  toggleMerchantMpOnlinePayment,
} from '../services/mpIntegration.service.js';

const uuidParamSchema = z.string().uuid('Código inválido.');
const MP_OAUTH_NONCE_COOKIE = 'mp_oauth_nonce';

function getMpOAuthNonceCookieOptions(maxAge?: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api/integrations/mercadopago/callback',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

function readCookieValue(req: Request, cookieName: string): string {
  const fromReqCookies = (req as Request & { cookies?: Record<string, unknown> })
    .cookies?.[cookieName];
  if (typeof fromReqCookies === 'string' && fromReqCookies.trim()) {
    return fromReqCookies.trim();
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === cookieName) {
      const rawVal = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(rawVal);
      } catch {
        return rawVal;
      }
    }
  }
  return '';
}

export async function connectMpHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const { authUrl, nonce } = await connectMerchantMp(
      catalogId,
      req.user!.id
    );

    res.cookie(
      MP_OAUTH_NONCE_COOKIE,
      nonce,
      getMpOAuthNonceCookieOptions(15 * 60 * 1000)
    );

    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
}

export async function mpCallbackHandler(
  req: Request,
  res: Response
): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
  const state =
    typeof req.query.state === 'string' ? req.query.state.trim() : '';
  const cookieNonce = readCookieValue(req, MP_OAUTH_NONCE_COOKIE);

  res.clearCookie(MP_OAUTH_NONCE_COOKIE, getMpOAuthNonceCookieOptions());

  const { redirectUrl } = await completeMpOAuthCallback({
    code,
    state,
    cookieNonce,
  });

  res.redirect(redirectUrl);
}

export async function toggleMpHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const enabled = Boolean(req.body?.enabled);

    const updated = await toggleMerchantMpOnlinePayment({
      catalogId,
      userId: req.user!.id,
      enabled,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function disconnectMpHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const catalogId = uuidParamSchema.parse(req.params.id);
    const result = await disconnectMerchantMp(catalogId, req.user!.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function mpOrdersWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const rawPaymentId =
    req.query['data.id'] ??
    req.body?.data?.id ??
    req.query.id ??
    req.body?.id;
  const dataIdForSignature =
    rawPaymentId !== undefined && rawPaymentId !== null
      ? String(rawPaymentId).trim()
      : undefined;

  const topic = String(
    req.body?.type || req.body?.topic || req.query.topic || ''
  ).toLowerCase();

  const queryCatalogId =
    typeof req.query.catalogId === 'string' ? req.query.catalogId.trim() : '';

  const xSignature =
    typeof req.headers['x-signature'] === 'string'
      ? req.headers['x-signature']
      : undefined;
  const xRequestId =
    typeof req.headers['x-request-id'] === 'string'
      ? req.headers['x-request-id']
      : undefined;

  const result = await handleMpOrdersWebhook({
    dataIdForSignature,
    topic,
    queryCatalogId,
    xSignature,
    xRequestId,
  });

  res.status(result.statusCode).json(result.body);
}
