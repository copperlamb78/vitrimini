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

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }
  return `${API_BASE_URL}${imageUrl}`;
}
