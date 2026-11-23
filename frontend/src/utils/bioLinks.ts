import type { BioLinksConfig } from '../types/catalog';
import { phoneToDDI } from './format';

export const DEFAULT_BIO_LINKS_CONFIG: BioLinksConfig = {
  enabled: false,
  theme: 'minimal',
  buttonStyle: 'card',
  showFeaturedProducts: true,
  socials: {},
  links: [],
};

export function normalizeBioLinksConfig(
  raw?: Partial<BioLinksConfig> | null
): BioLinksConfig {
  if (!raw) {
    return {
      ...DEFAULT_BIO_LINKS_CONFIG,
      socials: {},
      links: [],
    };
  }
  return {
    enabled: Boolean(raw.enabled),
    theme:
      raw.theme === 'brand-soft' || raw.theme === 'dark-glass'
        ? raw.theme
        : 'minimal',
    buttonStyle:
      raw.buttonStyle === 'pill' || raw.buttonStyle === 'outline'
        ? raw.buttonStyle
        : 'card',
    showFeaturedProducts:
      raw.showFeaturedProducts !== undefined ? Boolean(raw.showFeaturedProducts) : true,
    socials: {
      instagram: raw.socials?.instagram || '',
      tiktok: raw.socials?.tiktok || '',
      whatsapp: raw.socials?.whatsapp || '',
    },
    links: Array.isArray(raw.links) ? raw.links.slice(0, 8) : [],
  };
}

export function isSafeHttpUrl(raw?: string | null): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveSocialUrl(
  platform: 'instagram' | 'tiktok' | 'whatsapp',
  raw?: string | null
): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (platform === 'whatsapp') {
    if (isSafeHttpUrl(value)) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) return null;
    return `https://wa.me/${phoneToDDI(digits)}`;
  }

  if (isSafeHttpUrl(value)) return value;
  const handle = value.replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!handle) return null;

  return platform === 'instagram'
    ? `https://instagram.com/${handle}`
    : `https://tiktok.com/@${handle}`;
}

export function getContrastTextColor(hex: string): '#FFFFFF' | '#18181B' {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#18181B' : '#FFFFFF';
}
