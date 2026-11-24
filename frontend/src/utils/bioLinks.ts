import type {
  BioLinkItem,
  BioLinksBannerStyle,
  BioLinksConfig,
  BioLinksNichePreset,
} from '../types/catalog';
import { phoneToDDI } from './format';

export const DEFAULT_BIO_LINKS_CONFIG: BioLinksConfig = {
  enabled: false,
  theme: 'minimal',
  buttonStyle: 'card',
  showFeaturedProducts: true,
  nichePreset: 'default',
  bannerStyle: 'none',
  socials: {},
  links: [],
};

function normalizeNichePreset(raw?: string): BioLinksNichePreset {
  if (
    raw === 'bakery' ||
    raw === 'petshop' ||
    raw === 'fashion' ||
    raw === 'delivery'
  ) {
    return raw;
  }
  return 'default';
}

function normalizeBannerStyle(raw?: string): BioLinksBannerStyle {
  if (raw === 'brand-gradient' || raw === 'image') {
    return raw;
  }
  return 'none';
}

function normalizeLinkItem(item: Partial<BioLinkItem>): BioLinkItem {
  return {
    id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
    title: typeof item.title === 'string' ? item.title : '',
    subtitle: typeof item.subtitle === 'string' && item.subtitle.trim() ? item.subtitle : undefined,
    url: typeof item.url === 'string' ? item.url : '',
    icon: item.icon || 'link',
    highlighted: Boolean(item.highlighted),
    layout: item.layout === 'featured-card' ? 'featured-card' : 'compact',
    imageUrl:
      typeof item.imageUrl === 'string' && item.imageUrl.trim()
        ? item.imageUrl.trim()
        : undefined,
  };
}

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
    nichePreset: normalizeNichePreset(raw.nichePreset),
    bannerStyle: normalizeBannerStyle(raw.bannerStyle),
    bannerUrl:
      typeof raw.bannerUrl === 'string' && raw.bannerUrl.trim()
        ? raw.bannerUrl.trim()
        : undefined,
    socials: {
      instagram: raw.socials?.instagram || '',
      tiktok: raw.socials?.tiktok || '',
      whatsapp: raw.socials?.whatsapp || '',
    },
    links: Array.isArray(raw.links)
      ? raw.links.slice(0, 8).map((item) => normalizeLinkItem(item))
      : [],
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

export function hexToRgba(hex: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const raw = (hex || '').replace('#', '').trim();
  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(24, 24, 27, ${safeAlpha})`;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function getEffectiveOutlineColor(hex: string, isDarkTheme: boolean): string {
  if (!isDarkTheme) return hex;
  const clean = (hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#E4E4E7';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.2 ? '#E4E4E7' : hex;
}
