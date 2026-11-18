import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePixPaymentInput {
  catalogId: string;
  storeName: string;
  amount?: number;
}

export interface PixPaymentResult {
  paymentId: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  mockMode: boolean;
}

const CATALOG_PRICE = 24.9;

export function isMockPixEnabled(): boolean {
  return process.env.MOCK_PIX === 'true' || !process.env.MP_ACCESS_TOKEN;
}

export async function createPixPayment({
  catalogId,
  storeName,
  amount = CATALOG_PRICE,
}: CreatePixPaymentInput): Promise<PixPaymentResult> {
  if (isMockPixEnabled()) {
    const paymentId = `mock_${uuidv4()}`;
    const pixCopyPaste = `00020126580014BR.GOV.BCB.PIX0136${catalogId}520400005303986540524.905802BR5909VitriMini6009SAO PAULO62070503***6304MOCK`;
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

  const accessToken = process.env.MP_ACCESS_TOKEN!;
  const notificationUrl = process.env.MP_WEBHOOK_URL || undefined;

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': catalogId,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      payment_method_id: 'pix',
      description: `VitriMini - ${storeName}`,
      external_reference: catalogId,
      notification_url: notificationUrl,
      payer: {
        email: 'lojista@vitrimini.com.br',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Mercado Pago Error]:', response.status, errorBody);
    throw new Error('Pix gateway request failed');
  }

  const data = (await response.json()) as {
    id: number | string;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
      };
    };
  };

  const txData = data.point_of_interaction?.transaction_data;
  const pixCopyPaste = txData?.qr_code ?? '';
  const rawBase64 = txData?.qr_code_base64 ?? '';
  const qrCodeBase64 = rawBase64.startsWith('data:image')
    ? rawBase64
    : `data:image/png;base64,${rawBase64}`;

  return {
    paymentId: String(data.id),
    qrCodeBase64,
    pixCopyPaste,
    mockMode: false,
  };
}

export async function verifyMercadoPagoPayment(
  paymentId: string
): Promise<{ approved: boolean; catalogId?: string }> {
  if (isMockPixEnabled()) {
    return { approved: true };
  }

  const accessToken = process.env.MP_ACCESS_TOKEN!;
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return { approved: false };
  }

  const data = (await response.json()) as {
    status?: string;
    external_reference?: string;
  };

  return {
    approved: data.status === 'approved',
    catalogId: data.external_reference,
  };
}
