export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function parsePriceToCents(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

export function centsToPriceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function formatPriceInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return centsToPriceInput(digits ? Number(digits) : 0);
}

const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|webp|avif);base64,/i;

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('http://') ||
    SAFE_DATA_IMAGE_REGEX.test(imageUrl) ||
    imageUrl.startsWith('blob:')
  ) {
    return imageUrl;
  }
  if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
    return `${API_BASE_URL}${imageUrl}`;
  }
  return null;
}

export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const isMercadoPagoHost =
      parsed.hostname === 'mercadopago.com' ||
      parsed.hostname.endsWith('.mercadopago.com') ||
      parsed.hostname === 'mercadopago.com.br' ||
      parsed.hostname.endsWith('.mercadopago.com.br');
    if (parsed.protocol === 'https:' && trimmed.startsWith('https://')) {
      return isMercadoPagoHost;
    }
    if (
      import.meta.env.DEV &&
      parsed.protocol === 'http:' &&
      parsed.hostname === 'localhost' &&
      trimmed.startsWith('http://localhost')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function safeRedirect(url: string | null | undefined): boolean {
  if (!isSafeExternalUrl(url)) {
    console.warn('[safeRedirect] URL bloqueada ou inválida:', url);
    return false;
  }
  window.location.assign(url!.trim());
  return true;
}

/**
 * Extrai apenas os 10 ou 11 dígitos locais (DDD + número),
 * removendo o DDI 55 caso venha salvo do banco.
 */
export function extractLocalPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

/**
 * Aplica máscara brasileira (99) 99999-9999 (celular) ou (99) 9999-9999 (fixo),
 * bloqueando letras/símbolos e limitando a 11 dígitos numéricos.
 */
export function formatPhoneMask(raw: string): string {
  const digits = extractLocalPhoneDigits(raw);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Normaliza telefone mascarado para envio à API com DDI 55 (ex: 5575999999999).
 */
export function phoneToDDI(raw: string): string {
  const local = extractLocalPhoneDigits(raw);
  if (local.length >= 10) {
    return `55${local}`;
  }
  return local;
}

export function isValidBrazilianPhone(raw: string): boolean {
  const local = extractLocalPhoneDigits(raw);
  return /^[1-9]{2}9?\d{8}$/.test(local);
}

export function normalizeEmailInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const clean = normalizeEmailInput(raw);
  return clean.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}
