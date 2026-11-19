import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePixPaymentInput {
  catalogId: string;
  storeName: string;
  amountCents?: number;
  payerEmail?: string;
  idempotencyKey?: string;
}

export interface PixPaymentResult {
  paymentId: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  mockMode: boolean;
}

const DEFAULT_AMOUNT_CENTS = 2490; // R$ 24,90

export function getCatalogPriceCents(): number {
  const raw = Number(process.env.CATALOG_PRICE_CENTS);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  return DEFAULT_AMOUNT_CENTS;
}

export function isMockPixEnabled(): boolean {
  return process.env.MOCK_PIX === 'true';
}

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN não configurado para pagamentos reais.');
  }
  return token;
}

export async function createPixPayment({
  catalogId,
  storeName: _storeName,
  amountCents = getCatalogPriceCents(),
  payerEmail,
  idempotencyKey,
}: CreatePixPaymentInput): Promise<PixPaymentResult> {
  const amountString = (amountCents / 100).toFixed(2);

  if (isMockPixEnabled()) {
    const paymentId = `mock_${uuidv4()}`;
    const pixCopyPaste = `00020126580014BR.GOV.BCB.PIX0136${catalogId}5204000053039865405${amountString}5802BR5909VitriMini6009SAO PAULO62070503***6304MOCK`;
    const qrCodeBase64 = await QRCode.toDataURL(pixCopyPaste, {
      width: 280,
      margin: 2,
    });

    return {
      paymentId,
      qrCodeBase64,
      pixCopyPaste,
      mockMode: true,
    };
  }

  const accessToken = getAccessToken();
  const resolvedEmail =
    payerEmail?.trim() || `cliente+${catalogId}@vitrimini.com.br`;

  const response = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey || `vitrimini-${catalogId}`,
    },
    body: JSON.stringify({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: amountString,
      external_reference: catalogId,
      description: 'VitriMini - Publicação de Vitrine (90 dias)',
      payer: {
        email: resolvedEmail,
      },
      transactions: {
        payments: [
          {
            amount: amountString,
            payment_method: {
              id: 'pix',
              type: 'bank_transfer',
            },
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Mercado Pago Orders Create Error]:', response.status, errorBody);
    throw new Error(`Orders API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    id: string;
    transactions?: {
      payments?: Array<{
        id?: string;
        payment_method?: {
          qr_code?: string;
          qr_code_base64?: string;
        };
      }>;
    };
  };

  const firstPayment = data.transactions?.payments?.[0];
  const pixCopyPaste = firstPayment?.payment_method?.qr_code ?? '';
  const rawBase64 = firstPayment?.payment_method?.qr_code_base64 ?? '';

  const qrCodeBase64 = rawBase64
    ? rawBase64.startsWith('data:image')
      ? rawBase64
      : `data:image/png;base64,${rawBase64}`
    : pixCopyPaste
      ? await QRCode.toDataURL(pixCopyPaste, { width: 280, margin: 2 })
      : '';

  return {
    paymentId: String(data.id),
    qrCodeBase64,
    pixCopyPaste,
    mockMode: false,
  };
}

export async function verifyMercadoPagoOrder(
  orderId: string
): Promise<{ approved: boolean; status?: string; catalogId?: string }> {
  if (isMockPixEnabled()) {
    return { approved: true, status: 'processed' };
  }

  const accessToken = getAccessToken();
  const response = await fetch(
    `https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Mercado Pago Orders Verify Error]:', response.status, errorBody);
    return { approved: false };
  }

  const data = (await response.json()) as {
    status?: string;
    status_detail?: string;
    external_reference?: string;
  };

  const isProcessed =
    data.status === 'processed' &&
    (!data.status_detail || data.status_detail === 'accredited');

  return {
    approved: isProcessed,
    status: data.status,
    catalogId: data.external_reference,
  };
}

export function validateMercadoPagoWebhookSignature(params: {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return true;
  }

  const { xSignature, xRequestId, dataId } = params;
  if (!xSignature || !xRequestId || !dataId) {
    return false;
  }

  let ts = '';
  let v1 = '';
  for (const part of xSignature.split(',')) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (trimmedKey === 'ts') ts = trimmedValue;
    if (trimmedKey === 'v1') v1 = trimmedValue;
  }

  if (!ts || !v1) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const calculatedHash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  try {
    const v1Buf = Buffer.from(v1, 'utf8');
    const calcBuf = Buffer.from(calculatedHash, 'utf8');
    if (v1Buf.length !== calcBuf.length) return false;
    return crypto.timingSafeEqual(v1Buf, calcBuf);
  } catch {
    return false;
  }
}
