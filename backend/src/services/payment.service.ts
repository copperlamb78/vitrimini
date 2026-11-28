import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export type PlanCode = 'ESSENTIAL_30' | 'PRO_30' | 'PRO_365';
export type LegacyPlanCode =
  | 'ESSENTIAL_90D'
  | 'PRO_90D'
  | 'ESSENTIAL_90'
  | 'PRO_90'
  | 'PRO_365D';

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Soma meses no calendário (fuso America/Sao_Paulo) preservando o dia âncora
 * da contratação e ajustando fins de mês (ex.: 31/01 -> 28/02 ou 29/02).
 */
export function addCalendarMonths(baseDate: Date, months: number): Date {
  const brt = new Date(baseDate.getTime() - BRT_OFFSET_MS);
  const year = brt.getUTCFullYear();
  const month = brt.getUTCMonth();
  const day = brt.getUTCDate();

  const totalMonths = year * 12 + month + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  const resultBrtMs = Date.UTC(
    targetYear,
    targetMonth,
    clampedDay,
    brt.getUTCHours(),
    brt.getUTCMinutes(),
    brt.getUTCSeconds(),
    brt.getUTCMilliseconds()
  );
  return new Date(resultBrtMs + BRT_OFFSET_MS);
}

export interface PlanDefinition {
  code: PlanCode;
  planType: 'ESSENTIAL' | 'PRO';
  days: number;
  months: 1 | 12;
  amountCents: number;
  label: string;
}

export const PLAN_CATALOG: Record<PlanCode, PlanDefinition> = {
  ESSENTIAL_30: {
    code: 'ESSENTIAL_30',
    planType: 'ESSENTIAL',
    days: 30,
    months: 1,
    amountCents: 990,
    label: 'VitriMini Essencial Mensal',
  },
  PRO_30: {
    code: 'PRO_30',
    planType: 'PRO',
    days: 30,
    months: 1,
    amountCents: 1490,
    label: 'VitriMini Pro Mensal',
  },
  PRO_365: {
    code: 'PRO_365',
    planType: 'PRO',
    days: 365,
    months: 12,
    amountCents: 14900,
    label: 'VitriMini Pro Anual',
  },
};

export const LEGACY_PLAN_MAP: Record<LegacyPlanCode, PlanCode> = {
  ESSENTIAL_90D: 'ESSENTIAL_30',
  ESSENTIAL_90: 'ESSENTIAL_30',
  PRO_90D: 'PRO_30',
  PRO_90: 'PRO_30',
  PRO_365D: 'PRO_365',
};

export function resolvePlanDefinition(rawCode?: unknown): PlanDefinition {
  if (typeof rawCode === 'string') {
    if (rawCode in PLAN_CATALOG) {
      return PLAN_CATALOG[rawCode as PlanCode];
    }
    if (rawCode in LEGACY_PLAN_MAP) {
      return PLAN_CATALOG[LEGACY_PLAN_MAP[rawCode as LegacyPlanCode]];
    }
  }
  return PLAN_CATALOG.ESSENTIAL_30;
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

const DEFAULT_AMOUNT_CENTS = PLAN_CATALOG.ESSENTIAL_30.amountCents; // R$ 9,90

export function getCatalogPriceCents(): number {
  return DEFAULT_AMOUNT_CENTS;
}

export function isMockPixEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
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
  description = 'VitriMini - Publicação de Vitrine',
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
  const testPayerEmail =
    process.env.NODE_ENV !== 'production'
      ? process.env.MP_TEST_PAYER_EMAIL?.trim()
      : undefined;
  const resolvedEmail =
    testPayerEmail ||
    payerEmail?.trim() ||
    `cliente+${catalogId}@vitrimini.com.br`;

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

export function getPixFeeRate(): number {
  const rawRate = Number(process.env.MP_PIX_FEE_RATE);
  if (Number.isFinite(rawRate) && rawRate >= 0 && rawRate < 0.5) {
    return rawRate;
  }
  const rawPct = Number(process.env.MP_PIX_FEE_PERCENT);
  if (Number.isFinite(rawPct) && rawPct >= 0 && rawPct < 50) {
    return rawPct / 100;
  }
  return 0.0099; // 0,99% padrão Pix MP
}

export function getCardFeeRate(): number {
  const rawRate = Number(process.env.MP_CARD_FEE_RATE);
  if (Number.isFinite(rawRate) && rawRate >= 0 && rawRate < 0.5) {
    return rawRate;
  }
  return 0.0498; // 4,98% padrão Cartão MP (recebimento na hora)
}

export function calculatePixFeeFallback(amountCents: number): {
  feeCents: number;
  netAmountCents: number;
} {
  const feeCents = Math.round(amountCents * getPixFeeRate());
  const netAmountCents = Math.max(0, amountCents - feeCents);
  return { feeCents, netAmountCents };
}

export function calculateCardFeeFallback(amountCents: number): {
  feeCents: number;
  netAmountCents: number;
} {
  const feeCents = Math.round(amountCents * getCardFeeRate());
  const netAmountCents = Math.max(0, amountCents - feeCents);
  return { feeCents, netAmountCents };
}

export async function verifyMercadoPagoOrder(
  orderId: string,
  expectedAmountCents?: number
): Promise<{
  approved: boolean;
  status?: string;
  catalogId?: string;
  paidCents?: number;
  feeCents?: number;
  netAmountCents?: number;
}> {
  if (isMockPixEnabled()) {
    return {
      approved: true,
      status: 'processed',
      paidCents: expectedAmountCents ?? getCatalogPriceCents(),
    };
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
    transactions?: {
      payments?: Array<{
        transaction_details?: { net_received_amount?: number };
        fee_details?: Array<{ amount?: number; fee_payer?: string }>;
      }>;
    };
  };

  const expectedCents = expectedAmountCents ?? getCatalogPriceCents();
  const rawTotal = data.total_amount;
  const parsedTotalAmount =
    typeof rawTotal === 'number'
      ? rawTotal
      : typeof rawTotal === 'string' && rawTotal.trim() !== ''
        ? Number(rawTotal.trim())
        : Number.NaN;

  const hasValidTotal =
    Number.isFinite(parsedTotalAmount) && parsedTotalAmount > 0;
  const paidCents = hasValidTotal
    ? Math.round(parsedTotalAmount * 100)
    : undefined;

  const isAmountValid =
    paidCents !== undefined && paidCents >= expectedCents;
  const isProcessed =
    data.status === 'processed' &&
    (!data.status_detail || data.status_detail === 'accredited') &&
    isAmountValid;

  const firstTx = data.transactions?.payments?.[0];
  const rawNet = firstTx?.transaction_details?.net_received_amount;
  let feeCents: number | undefined;
  let netAmountCents: number | undefined;

  if (paidCents !== undefined) {
    if (typeof rawNet === 'number' && Number.isFinite(rawNet) && rawNet >= 0) {
      netAmountCents = Math.min(paidCents, Math.round(rawNet * 100));
      feeCents = Math.max(0, paidCents - netAmountCents);
    } else if (Array.isArray(firstTx?.fee_details) && firstTx.fee_details.length > 0) {
      const sumFee = firstTx.fee_details
        .filter((f) => !f.fee_payer || f.fee_payer === 'collector')
        .reduce((acc, f) => acc + (typeof f.amount === 'number' ? f.amount : 0), 0);
      feeCents = Math.max(0, Math.round(sumFee * 100));
      netAmountCents = Math.max(0, paidCents - feeCents);
    } else if (isProcessed) {
      const fallback = calculatePixFeeFallback(paidCents);
      feeCents = fallback.feeCents;
      netAmountCents = fallback.netAmountCents;
    }
  }

  return {
    approved: isProcessed,
    status: data.status,
    catalogId: data.external_reference,
    paidCents,
    feeCents,
    netAmountCents,
  };
}

const WEBHOOK_MAX_AGE_SECONDS = 15 * 60; // 15 minutos contra replay attack

export function validateMercadoPagoWebhookSignature(params: {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    // Em modo real (não-mock), nunca aceita webhook sem MP_WEBHOOK_SECRET configurado
    return isMockPixEnabled();
  }

  const { xSignature, xRequestId, dataId } = params;
  if (!xSignature || !xRequestId || !dataId) {
    console.warn('[MP Webhook Signature] Cabeçalhos ausentes:', {
      hasSignature: Boolean(xSignature),
      hasRequestId: Boolean(xRequestId),
      hasDataId: Boolean(dataId),
    });
    return false;
  }

  let ts = '';
  let v1 = '';
  for (const part of xSignature.split(',')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const trimmedKey = part.slice(0, eqIdx).trim();
    const trimmedValue = part.slice(eqIdx + 1).trim();
    if (trimmedKey === 'ts') ts = trimmedValue;
    if (trimmedKey === 'v1') v1 = trimmedValue.toLowerCase();
  }

  if (!ts || !v1) {
    console.warn('[MP Webhook Signature] ts ou v1 ausente em x-signature');
    return false;
  }

  // Proteção contra replay attack: aceita ts em segundos ou milissegundos
  const numericTs = Number(ts);
  if (!Number.isFinite(numericTs) || numericTs <= 0) {
    return false;
  }
  const tsSeconds = numericTs > 1e12 ? Math.floor(numericTs / 1000) : numericTs;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > WEBHOOK_MAX_AGE_SECONDS) {
    console.warn('[MP Webhook Signature] Timestamp fora da janela:', {
      diffSeconds: Math.abs(nowSeconds - tsSeconds),
    });
    return false;
  }

  // Especificação oficial Mercado Pago: data.id alfanumérico deve ir em minúsculas no manifest
  const normalizedDataId = dataId.trim().toLowerCase();
  const manifest = `id:${normalizedDataId};request-id:${xRequestId.trim()};ts:${ts};`;
  const calculatedHash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')
    .toLowerCase();

  try {
    const v1Buf = Buffer.from(v1, 'utf8');
    const calcBuf = Buffer.from(calculatedHash, 'utf8');
    if (v1Buf.length !== calcBuf.length) return false;
    const ok = crypto.timingSafeEqual(v1Buf, calcBuf);
    if (!ok) {
      console.warn('[MP Webhook Signature] Hash divergente — verifique MP_WEBHOOK_SECRET no Render');
    }
    return ok;
  } catch {
    return false;
  }
}

export interface CreateCardSubscriptionInput {
  catalogId: string;
  storeName: string;
  planCode: PlanCode | LegacyPlanCode;
  payerEmail: string;
  backUrl: string;
  externalReference?: string;
}

export interface CreateCardSubscriptionResult {
  preapprovalId: string;
  initPoint: string;
  mockMode: boolean;
}

export async function createCardSubscription({
  catalogId,
  storeName: _storeName,
  planCode,
  payerEmail,
  backUrl,
  externalReference,
}: CreateCardSubscriptionInput): Promise<CreateCardSubscriptionResult> {
  const planDef = resolvePlanDefinition(planCode);

  if (isMockPixEnabled()) {
    return {
      preapprovalId: `mock_sub_${uuidv4()}`,
      initPoint: `${backUrl}&mock_sub=1`,
      mockMode: true,
    };
  }

  const accessToken = getAccessToken();
  const testPayerEmail =
    process.env.NODE_ENV !== 'production'
      ? process.env.MP_TEST_PAYER_EMAIL?.trim()
      : undefined;
  const resolvedEmail =
    testPayerEmail ||
    payerEmail?.trim() ||
    `cliente+${catalogId}@vitrimini.com.br`;

  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: planDef.label,
      external_reference: externalReference ?? catalogId,
      payer_email: resolvedEmail,
      auto_recurring: {
        frequency: planDef.months,
        frequency_type: 'months',
        transaction_amount: Number((planDef.amountCents / 100).toFixed(2)),
        currency_id: 'BRL',
      },
      back_url: backUrl,
      status: 'pending',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      '[Mercado Pago Preapproval Create Error]:',
      response.status,
      errorBody
    );
    throw new Error(
      `Preapproval API request failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };

  const initPoint =
    process.env.NODE_ENV === 'production'
      ? data.init_point || data.sandbox_init_point || ''
      : data.sandbox_init_point || data.init_point || '';
  if (!data.id || !initPoint) {
    console.error('[createCardSubscription] Resposta do Mercado Pago sem init_point:', {
      status: response.status,
      id: data?.id ?? null,
      hasInitPoint: Boolean(data?.init_point),
      hasSandboxInitPoint: Boolean(data?.sandbox_init_point),
    });
    throw new Error('Mercado Pago não retornou init_point da assinatura.');
  }

  return {
    preapprovalId: String(data.id),
    initPoint,
    mockMode: false,
  };
}

export interface MercadoPagoPreapprovalData {
  id?: string;
  status?: string;
  external_reference?: string;
  next_payment_date?: string;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
  };
}

export async function fetchMercadoPagoPreapproval(
  preapprovalId: string
): Promise<MercadoPagoPreapprovalData | null> {
  if (isMockPixEnabled()) {
    return {
      id: preapprovalId,
      status: 'authorized',
    };
  }

  const accessToken = getAccessToken();
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      '[Mercado Pago Preapproval Fetch Error]:',
      response.status,
      errorBody
    );
    return null;
  }

  return (await response.json()) as MercadoPagoPreapprovalData;
}

export interface MercadoPagoAuthorizedPaymentData {
  id?: string | number;
  preapproval_id?: string;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  net_received_amount?: number;
  payment?: {
    id?: string | number;
    status?: string;
  };
}

export async function fetchMercadoPagoAuthorizedPayment(
  paymentId: string
): Promise<MercadoPagoAuthorizedPaymentData | null> {
  if (isMockPixEnabled()) {
    return {
      id: paymentId,
      status: 'processed',
    };
  }

  const accessToken = getAccessToken();
  const response = await fetch(
    `https://api.mercadopago.com/authorized_payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      '[Mercado Pago Authorized Payment Fetch Error]:',
      response.status,
      errorBody
    );
    return null;
  }

  return (await response.json()) as MercadoPagoAuthorizedPaymentData;
}

export async function searchMercadoPagoAuthorizedPaymentsByPreapproval(
  preapprovalId: string
): Promise<MercadoPagoAuthorizedPaymentData[]> {
  if (isMockPixEnabled() || preapprovalId.startsWith('mock_sub_')) {
    return [];
  }

  const accessToken = getAccessToken();
  const response = await fetch(
    `https://api.mercadopago.com/authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    results?: MercadoPagoAuthorizedPaymentData[];
  };
  return Array.isArray(data.results) ? data.results : [];
}

export interface MercadoPagoPaymentData {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  preapproval_id?: string;
  metadata?: {
    preapproval_id?: string;
    [key: string]: unknown;
  };
  point_of_interaction?: {
    transaction_data?: {
      subscription_id?: string;
    };
  };
  transaction_details?: {
    net_received_amount?: number;
  };
  fee_details?: Array<{
    amount?: number;
    fee_payer?: string;
  }>;
}

export async function fetchMercadoPagoPayment(
  paymentId: string
): Promise<MercadoPagoPaymentData | null> {
  if (isMockPixEnabled()) {
    return null;
  }

  const accessToken = getAccessToken();
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as MercadoPagoPaymentData;
}

export async function cancelMercadoPagoPreapproval(
  preapprovalId: string
): Promise<{ cancelled: boolean; mockMode?: boolean }> {
  if (isMockPixEnabled() || preapprovalId.startsWith('mock_sub_')) {
    return { cancelled: true, mockMode: true };
  }

  const accessToken = getAccessToken();
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      '[Mercado Pago Preapproval Cancel Error]:',
      response.status,
      errorBody
    );
    throw new Error(
      `Preapproval cancel failed with status ${response.status}`
    );
  }

  return { cancelled: true, mockMode: false };
}
