import { prisma } from '../lib/prisma.js';
import {
  decryptSecret,
  encryptSecret,
  signMpOAuthState,
} from '../utils/crypto.js';
import { getFrontendBaseUrl } from './email.service.js';

export interface CatalogProCheckInput {
  status: string;
  planType: string;
  isTrial: boolean;
  expiresAt: Date | null;
}

export function hasProFeatures(catalog: CatalogProCheckInput): boolean {
  if (catalog.status !== 'ACTIVE') return false;
  if (catalog.expiresAt && catalog.expiresAt <= new Date()) return false;
  return catalog.planType === 'PRO' || catalog.isTrial;
}

export function getBackendPublicUrl(): string {
  const configured = process.env.BACKEND_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return process.env.NODE_ENV === 'production'
    ? 'https://api.vitrimini.com.br'
    : 'http://localhost:3333';
}

export function getMpOAuthConfig() {
  const appId = process.env.MP_APP_ID?.trim() || '';
  const clientSecret = process.env.MP_CLIENT_SECRET?.trim() || '';
  const redirectUri =
    process.env.MP_OAUTH_REDIRECT_URI?.trim() ||
    `${getBackendPublicUrl()}/api/integrations/mercadopago/callback`;

  return { appId, clientSecret, redirectUri };
}

export function buildMpAuthorizationUrl(
  catalogId: string,
  userId: string,
  nonce?: string
): string {
  const { appId, redirectUri } = getMpOAuthConfig();
  if (!appId) {
    throw new Error('MP_APP_ID não configurado no servidor.');
  }
  const state = signMpOAuthState(catalogId, userId, nonce);
  const params = new URLSearchParams({
    client_id: appId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: redirectUri,
  });
  return `https://auth.mercadopago.com.br/authorization?${params.toString()}`;
}

export async function fetchMpUserId(accessToken: string): Promise<string | null> {
  const res = await fetch('https://api.mercadopago.com/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[MP Users Me Error]:', res.status, errBody);
    return null;
  }

  const data = (await res.json()) as { id?: number | string };
  if (
    data?.id !== undefined &&
    data?.id !== null &&
    String(data.id).trim() !== ''
  ) {
    return String(data.id).trim();
  }
  return null;
}

interface MpOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number | string;
}

export async function exchangeMpCodeForTokens(
  code: string
): Promise<MpOAuthTokenResponse> {
  const { appId, clientSecret, redirectUri } = getMpOAuthConfig();
  if (!appId || !clientSecret) {
    throw new Error('Credenciais MP_APP_ID / MP_CLIENT_SECRET não configuradas.');
  }

  const res = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: appId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[MP OAuth Token Exchange Error]:', res.status, body);
    throw new Error('Falha ao trocar código pelo token do Mercado Pago.');
  }

  return (await res.json()) as MpOAuthTokenResponse;
}

export async function getValidMerchantMpToken(catalog: {
  id: string;
  mpAccessToken: string | null;
  mpRefreshToken: string | null;
  mpTokenExpiresAt: Date | null;
}): Promise<string> {
  if (!catalog.mpAccessToken) {
    throw new Error('Conta Mercado Pago não conectada nesta vitrine.');
  }

  const refreshBufferMs = 5 * 60 * 1000;
  const isExpiringSoon =
    catalog.mpTokenExpiresAt !== null &&
    catalog.mpTokenExpiresAt.getTime() - refreshBufferMs <= Date.now();

  if (!isExpiringSoon) {
    return decryptSecret(catalog.mpAccessToken);
  }

  if (!catalog.mpRefreshToken) {
    return decryptSecret(catalog.mpAccessToken);
  }

  const { appId, clientSecret } = getMpOAuthConfig();
  if (!appId || !clientSecret) {
    return decryptSecret(catalog.mpAccessToken);
  }

  const currentRefreshToken = decryptSecret(catalog.mpRefreshToken);
  const res = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: appId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: currentRefreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[MP OAuth Refresh Error]:', res.status, body);
    throw new Error('Não foi possível renovar a conexão com o Mercado Pago.');
  }

  const refreshed = (await res.json()) as MpOAuthTokenResponse;
  const nextExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000)
    : null;

  await prisma.catalog.update({
    where: { id: catalog.id },
    data: {
      mpAccessToken: encryptSecret(refreshed.access_token),
      ...(refreshed.refresh_token
        ? { mpRefreshToken: encryptSecret(refreshed.refresh_token) }
        : {}),
      mpTokenExpiresAt: nextExpiresAt,
    },
  });

  return refreshed.access_token;
}

export async function createMerchantOnlinePayment(params: {
  catalog: {
    id: string;
    storeName: string;
    mpAccessToken: string | null;
    mpRefreshToken: string | null;
    mpTokenExpiresAt: Date | null;
    mpAcceptPix?: boolean;
    mpAcceptCard?: boolean;
  };
  order: {
    id: string;
    orderNumber: number;
    trackingCode: string;
    totalCents: number;
    customerName: string;
  };
  paymentMethod: 'PIX' | 'CARD';
}): Promise<{
  mpPaymentId: string;
  qrCodeBase64?: string;
  pixCopyPaste?: string;
  checkoutUrl?: string;
}> {
  const accessToken = await getValidMerchantMpToken(params.catalog);
  const notificationUrl = `${getBackendPublicUrl()}/api/webhooks/mercadopago/orders?catalogId=${encodeURIComponent(
    params.catalog.id
  )}`;
  const amountFloat = Number((params.order.totalCents / 100).toFixed(2));
  const trackingUrl = `${getFrontendBaseUrl()}/pedido/${params.order.trackingCode}`;

  if (params.paymentMethod === 'PIX') {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `vitrimini-order-${params.order.id}`,
      },
      body: JSON.stringify({
        transaction_amount: amountFloat,
        description: `${params.catalog.storeName} — Pedido #${params.order.orderNumber}`,
        payment_method_id: 'pix',
        external_reference: params.order.id,
        notification_url: notificationUrl,
        payer: {
          email: `pedido+${params.order.trackingCode.toLowerCase()}@vitrimini.com.br`,
          first_name: params.order.customerName.slice(0, 60),
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[MP Merchant Pix Create Error]:', res.status, errBody);
      throw new Error('Não foi possível gerar o Pix online no Mercado Pago.');
    }

    const data = (await res.json()) as {
      id: number | string;
      point_of_interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
        };
      };
    };

    const txData = data.point_of_interaction?.transaction_data;
    if (!txData?.qr_code || !txData?.qr_code_base64) {
      throw new Error('O Mercado Pago não retornou o código Pix.');
    }

    const rawBase64 = txData.qr_code_base64;
    return {
      mpPaymentId: String(data.id),
      pixCopyPaste: txData.qr_code,
      qrCodeBase64: rawBase64.startsWith('data:image')
        ? rawBase64
        : `data:image/png;base64,${rawBase64}`,
    };
  }

  // Cartão / Checkout Pro do lojista
  const excludedPaymentTypes: Array<{ id: string }> = [{ id: 'ticket' }];
  if (params.catalog.mpAcceptPix === false) {
    excludedPaymentTypes.push({ id: 'bank_transfer' });
  }
  if (params.catalog.mpAcceptCard === false) {
    excludedPaymentTypes.push(
      { id: 'credit_card' },
      { id: 'debit_card' },
      { id: 'prepaid_card' }
    );
  }

  const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          title: `${params.catalog.storeName} — Pedido #${params.order.orderNumber}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amountFloat,
        },
      ],
      payment_methods: {
        excluded_payment_types: excludedPaymentTypes,
      },
      external_reference: params.order.id,
      notification_url: notificationUrl,
      back_urls: {
        success: trackingUrl,
        pending: trackingUrl,
        failure: trackingUrl,
      },
      auto_return: 'approved',
    }),
  });

  if (!prefRes.ok) {
    const errBody = await prefRes.text();
    console.error('[MP Merchant Preference Error]:', prefRes.status, errBody);
    throw new Error('Não foi possível iniciar o pagamento com cartão.');
  }

  const prefData = (await prefRes.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };

  return {
    mpPaymentId: prefData.id,
    checkoutUrl: prefData.init_point || prefData.sandbox_init_point,
  };
}

export async function fetchMerchantMpPayment(
  catalog: {
    id: string;
    mpAccessToken: string | null;
    mpRefreshToken: string | null;
    mpTokenExpiresAt: Date | null;
  },
  mpPaymentId: string
): Promise<{
  id: string;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  collector_id?: string;
  external_reference?: string;
  netReceivedCents?: number;
  feeCentsFromDetails?: number;
}> {
  const accessToken = await getValidMerchantMpToken(catalog);
  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(mpPaymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error('[MP Fetch Payment Error]:', res.status, errBody);
    throw new Error('Falha ao consultar pagamento no Mercado Pago.');
  }

  const data = (await res.json()) as {
    id: number | string;
    status: string;
    status_detail?: string;
    transaction_amount?: number;
    currency_id?: string;
    collector_id?: number | string;
    external_reference?: string;
    transaction_details?: {
      net_received_amount?: number;
    };
    fee_details?: Array<{
      amount?: number;
      fee_payer?: string;
    }>;
  };

  const rawNet = data.transaction_details?.net_received_amount;
  const netReceivedCents =
    typeof rawNet === 'number' && Number.isFinite(rawNet) && rawNet >= 0
      ? Math.round(rawNet * 100)
      : undefined;

  let feeCentsFromDetails: number | undefined;
  if (Array.isArray(data.fee_details) && data.fee_details.length > 0) {
    const collectorFees = data.fee_details.filter(
      (f) => !f.fee_payer || f.fee_payer === 'collector'
    );
    const totalFeeFloat = collectorFees.reduce(
      (acc, f) => acc + (typeof f.amount === 'number' ? f.amount : 0),
      0
    );
    if (Number.isFinite(totalFeeFloat) && totalFeeFloat >= 0) {
      feeCentsFromDetails = Math.round(totalFeeFloat * 100);
    }
  }

  return {
    id: String(data.id),
    status: data.status,
    status_detail:
      typeof data.status_detail === 'string' ? data.status_detail : undefined,
    transaction_amount:
      typeof data.transaction_amount === 'number' &&
      Number.isFinite(data.transaction_amount)
        ? data.transaction_amount
        : undefined,
    currency_id:
      typeof data.currency_id === 'string' ? data.currency_id : undefined,
    collector_id:
      data.collector_id !== undefined &&
      data.collector_id !== null &&
      String(data.collector_id).trim() !== ''
        ? String(data.collector_id).trim()
        : undefined,
    external_reference: data.external_reference,
    netReceivedCents,
    feeCentsFromDetails,
  };
}
