import crypto from 'node:crypto';
import { AppError, FRIENDLY_ERRORS } from '../middlewares/errorHandler.js';
import { encryptSecret, verifyMpOAuthState } from '../utils/crypto.js';
import {
  buildMpAuthorizationUrl,
  exchangeMpCodeForTokens,
  fetchMerchantMpPayment,
  fetchMpUserId,
  hasProFeatures,
} from './mpOAuth.service.js';
import {
  getFrontendBaseUrl,
  sendNewOrderEmail,
} from './email.service.js';
import {
  isMockPixEnabled,
  validateMercadoPagoWebhookSignature,
} from './payment.service.js';
import {
  cancelPendingOnlineOrder,
  clearCatalogMpCredentials,
  findCatalogMpCredentialsById,
  findCatalogMpCredentialsByPaymentId,
  findOrderForWebhookApproval,
  findOwnedCatalogForMpCallback,
  findOwnedCatalogForMpConnect,
  findOwnedCatalogForMpDisconnect,
  findOwnedCatalogForMpToggle,
  findPaidOrderReplay,
  promoteOrderToPaid,
  saveCatalogMpCredentials,
  updateCatalogMpPaymentMethods,
  updateCatalogOnlinePaymentEnabled,
} from '../repositories/mp.repository.js';

export async function connectMerchantMp(catalogId: string, userId: string) {
  const catalog = await findOwnedCatalogForMpConnect(catalogId, userId);

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  if (!hasProFeatures(catalog)) {
    throw new AppError(
      403,
      'O pagamento online automático faz parte do Plano Pro (ou dos 15 dias grátis).'
    );
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const authUrl = buildMpAuthorizationUrl(catalog.id, userId, nonce);

  return { authUrl, nonce };
}

export async function completeMpOAuthCallback(params: {
  code: string;
  state: string;
  cookieNonce: string;
}): Promise<{ redirectUrl: string }> {
  const frontendUrl = getFrontendBaseUrl();
  const { code, state, cookieNonce } = params;

  const verified = verifyMpOAuthState(state);
  if (!verified || !code || !cookieNonce) {
    return { redirectUrl: `${frontendUrl}/minhas-vitrines?mp=error` };
  }

  const cookieBuf = Buffer.from(cookieNonce, 'utf8');
  const stateBuf = Buffer.from(verified.nonce, 'utf8');
  if (
    cookieBuf.length !== stateBuf.length ||
    !crypto.timingSafeEqual(cookieBuf, stateBuf)
  ) {
    return { redirectUrl: `${frontendUrl}/minhas-vitrines?mp=error` };
  }

  try {
    const catalog = await findOwnedCatalogForMpCallback(
      verified.catalogId,
      verified.userId
    );

    if (!catalog) {
      return { redirectUrl: `${frontendUrl}/minhas-vitrines?mp=error` };
    }

    const tokens = await exchangeMpCodeForTokens(code);
    let resolvedMpUserId =
      tokens.user_id !== undefined &&
      tokens.user_id !== null &&
      String(tokens.user_id).trim() !== ''
        ? String(tokens.user_id).trim()
        : null;

    if (!resolvedMpUserId) {
      resolvedMpUserId = await fetchMpUserId(tokens.access_token);
    }

    if (!resolvedMpUserId) {
      console.error(
        '[MP OAuth Callback Error]: Conta Mercado Pago sem user_id identificável.'
      );
      return { redirectUrl: `${frontendUrl}/painel/${catalog.id}?mp=error` };
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await saveCatalogMpCredentials({
      catalogId: catalog.id,
      userId: verified.userId,
      mpUserId: resolvedMpUserId,
      mpAccessToken: encryptSecret(tokens.access_token),
      mpRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : null,
      mpTokenExpiresAt: expiresAt,
    });

    return { redirectUrl: `${frontendUrl}/painel/${catalog.id}?mp=connected` };
  } catch (err) {
    console.error('[MP OAuth Callback Error]:', err);
    return {
      redirectUrl: `${frontendUrl}/painel/${verified.catalogId}?mp=error`,
    };
  }
}

export async function toggleMerchantMpOnlinePayment(params: {
  catalogId: string;
  userId: string;
  enabled: boolean;
}) {
  const catalog = await findOwnedCatalogForMpToggle(
    params.catalogId,
    params.userId
  );

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  if (params.enabled && !hasProFeatures(catalog)) {
    throw new AppError(
      403,
      'O pagamento online automático faz parte do Plano Pro.'
    );
  }

  if (params.enabled && !catalog.mpAccessToken) {
    throw new AppError(
      400,
      'Conecte sua conta Mercado Pago antes de ativar o pagamento online.'
    );
  }

  return updateCatalogOnlinePaymentEnabled({
    catalogId: catalog.id,
    userId: params.userId,
    enabled: params.enabled,
  });
}

export async function updateMerchantMpPaymentMethods(params: {
  catalogId: string;
  userId: string;
  mpAcceptPix: boolean;
  mpAcceptCard: boolean;
}) {
  const catalog = await findOwnedCatalogForMpToggle(
    params.catalogId,
    params.userId
  );

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  if (!hasProFeatures(catalog)) {
    throw new AppError(
      403,
      'O pagamento online automático faz parte do Plano Pro.'
    );
  }

  if (catalog.mpAccessToken && !params.mpAcceptPix && !params.mpAcceptCard) {
    throw new AppError(
      400,
      'Mantenha pelo menos Pix ou Cartão ativo enquanto o Mercado Pago estiver conectado (ou desconecte a conta para aceitar apenas pedidos no WhatsApp).'
    );
  }

  return updateCatalogMpPaymentMethods({
    catalogId: catalog.id,
    userId: params.userId,
    mpAcceptPix: params.mpAcceptPix,
    mpAcceptCard: params.mpAcceptCard,
  });
}

export async function disconnectMerchantMp(catalogId: string, userId: string) {
  const catalog = await findOwnedCatalogForMpDisconnect(catalogId, userId);

  if (!catalog) {
    throw new AppError(404, FRIENDLY_ERRORS.NOT_FOUND);
  }

  await clearCatalogMpCredentials(catalog.id, userId);

  return { disconnected: true };
}

export async function handleMpOrdersWebhook(params: {
  dataIdForSignature?: string;
  topic: string;
  queryCatalogId: string;
  xSignature?: string;
  xRequestId?: string;
}): Promise<{
  statusCode: 200 | 401;
  body: { received: true } | { error: string };
}> {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd || !isMockPixEnabled()) {
      const isSignatureValid = validateMercadoPagoWebhookSignature({
        xSignature: params.xSignature,
        xRequestId: params.xRequestId,
        dataId: params.dataIdForSignature,
      });
      if (!isSignatureValid) {
        return {
          statusCode: 401,
          body: { error: 'Assinatura de webhook inválida.' },
        };
      }
    }

    if (
      !params.dataIdForSignature ||
      (params.topic && params.topic !== 'payment')
    ) {
      return { statusCode: 200, body: { received: true } };
    }

    const mpPaymentId = params.dataIdForSignature;

    let catalog = params.queryCatalogId
      ? await findCatalogMpCredentialsById(params.queryCatalogId)
      : null;

    if (!catalog) {
      catalog = await findCatalogMpCredentialsByPaymentId(mpPaymentId);
    }

    if (!catalog || !catalog.mpAccessToken) {
      return { statusCode: 200, body: { received: true } };
    }

    const mpPayment = await fetchMerchantMpPayment(catalog, mpPaymentId);
    if (
      catalog.mpUserId &&
      catalog.mpUserId !== 'connected' &&
      mpPayment.collector_id &&
      String(mpPayment.collector_id) !== catalog.mpUserId
    ) {
      console.warn('[MP Order Webhook] collector_id divergente da vitrine:', {
        catalogId: catalog.id,
        expectedCollectorId: catalog.mpUserId,
        receivedCollectorId: mpPayment.collector_id,
      });
      return { statusCode: 200, body: { received: true } };
    }

    const orderId = mpPayment.external_reference?.trim();
    if (!orderId) {
      return { statusCode: 200, body: { received: true } };
    }

    const canonicalMpPaymentId = String(mpPayment.id);

    if (
      mpPayment.status === 'approved' &&
      (!mpPayment.status_detail || mpPayment.status_detail === 'accredited')
    ) {
      const targetOrder = await findOrderForWebhookApproval(
        orderId,
        catalog.id
      );

      if (targetOrder) {
        const isCurrencyValid = mpPayment.currency_id === 'BRL';
        const isAmountValid =
          typeof mpPayment.transaction_amount === 'number' &&
          Math.round(mpPayment.transaction_amount * 100) >=
            targetOrder.totalCents;
        const isChannelValid = targetOrder.paymentChannel === 'MERCADO_PAGO';

        if (!isCurrencyValid || !isAmountValid || !isChannelValid) {
          console.warn(
            '[MP Order Webhook] Pagamento rejeitado na validação:',
            {
              orderId: targetOrder.id,
              currencyId: mpPayment.currency_id,
              amount: mpPayment.transaction_amount,
              expectedCents: targetOrder.totalCents,
              paymentChannel: targetOrder.paymentChannel,
            }
          );
          return { statusCode: 200, body: { received: true } };
        }

        const existingPaidReplay = await findPaidOrderReplay(
          canonicalMpPaymentId,
          targetOrder.id
        );

        if (existingPaidReplay) {
          console.warn('[MP Order Webhook] Replay de mpPaymentId bloqueado:', {
            mpPaymentId: canonicalMpPaymentId,
            existingOrderId: existingPaidReplay.id,
            targetOrderId: targetOrder.id,
          });
          return { statusCode: 200, body: { received: true } };
        }

        const netAmountCents =
          mpPayment.netReceivedCents !== undefined
            ? Math.min(targetOrder.totalCents, mpPayment.netReceivedCents)
            : Math.max(
                0,
                targetOrder.totalCents - (mpPayment.feeCentsFromDetails ?? 0)
              );
        const mpFeeCents = Math.max(
          0,
          targetOrder.totalCents - netAmountCents
        );

        const promoted = await promoteOrderToPaid({
          orderId: targetOrder.id,
          catalogId: catalog.id,
          mpPaymentId: canonicalMpPaymentId,
          mpFeeCents,
          netAmountCents,
        });

        if (
          promoted.count > 0 &&
          targetOrder.catalog.notifyOrderByEmail &&
          targetOrder.catalog.user?.email
        ) {
          void sendNewOrderEmail({
            to: targetOrder.catalog.user.email,
            merchantName: targetOrder.catalog.user.name,
            storeName: targetOrder.catalog.storeName,
            catalogId: targetOrder.catalog.id,
            orderNumber: targetOrder.orderNumber,
            customerName: targetOrder.customerName,
            totalCents: targetOrder.totalCents,
            deliveryType: targetOrder.deliveryType,
            items: targetOrder.items,
          }).catch((mailErr) => {
            console.error('[New Order Email Error]:', mailErr);
          });
        }
      }
    } else if (
      mpPayment.status === 'cancelled' ||
      mpPayment.status === 'rejected'
    ) {
      await cancelPendingOnlineOrder({
        orderId,
        catalogId: catalog.id,
        mpPaymentId: canonicalMpPaymentId,
      });
    }

    return { statusCode: 200, body: { received: true } };
  } catch (err) {
    console.error('[MP Order Webhook Error]:', err);
    return { statusCode: 200, body: { received: true } };
  }
}
