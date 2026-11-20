import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export type PlanCode = 'ESSENTIAL_90D' | 'PRO_90D' | 'PRO_365D';

export interface PlanDefinition {
  code: PlanCode;
  planType: 'ESSENTIAL' | 'PRO';
  days: number;
  amountCents: number;
  label: string;
}

export const PLAN_CATALOG: Record<PlanCode, PlanDefinition> = {
  ESSENTIAL_90D: {
    code: 'ESSENTIAL_90D',
    planType: 'ESSENTIAL',
    days: 90,
    amountCents: 2490,
    label: 'VitriMini Essencial (90 dias)',
  },
  PRO_90D: {
    code: 'PRO_90D',
    planType: 'PRO',
    days: 90,
    amountCents: 3990,
    label: 'VitriMini Pro Trimestral (90 dias)',
  },
  PRO_365D: {
    code: 'PRO_365D',
    planType: 'PRO',
    days: 365,
    amountCents: 9990,
    label: 'VitriMini Pro Anual (365 dias)',
  },
};

export function resolvePlanDefinition(rawCode?: unknown): PlanDefinition {
  if (typeof rawCode === 'string' && rawCode in PLAN_CATALOG) {
    return PLAN_CATALOG[rawCode as PlanCode];
  }
  return {
    ...PLAN_CATALOG.ESSENTIAL_90D,
    amountCents: getCatalogPriceCents(),
  };
}

export interface CreatePixPaymentInput {
  catalogId: string;
  storeName: string;
  amountCents?: number;
  description?: string;
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
  description = 'VitriMini - Publicação de Vitrine (90 dias)',
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
      description,
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
    total_amount?: string | number;
  };

  const expectedCents = getCatalogPriceCents();
  const paidCents =
    data.total_amount !== undefined
      ? Math.round(Number(data.total_amount) * 100)
      : expectedCents;

  const isAmountValid = Number.isFinite(paidCents) && paidCents >= expectedCents;
  const isProcessed =
    data.status === 'processed' &&
    (!data.status_detail || data.status_detail === 'accredited') &&
    isAmountValid;

  return {
    approved: isProcessed,
    status: data.status,
    catalogId: data.external_reference,
  };
}

const WEBHOOK_MAX_AGE_SECONDS = 5 * 60; // 5 minutos contra replay attack

export function validateMercadoPagoWebhookSignature(params: {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Em modo real (não-mock), nunca aceita webhook sem MP_WEBHOOK_SECRET configurado
    return isMockPixEnabled();
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

  // Proteção contra replay attack: aceita ts em segundos ou milissegundos dentro de +-5 min
  const numericTs = Number(ts);
  if (!Number.isFinite(numericTs) || numericTs <= 0) {
    return false;
  }
  const tsSeconds = numericTs > 1e12 ? Math.floor(numericTs / 1000) : numericTs;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > WEBHOOK_MAX_AGE_SECONDS) {
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
