import type {
  BioLinkItem,
  BioLinksBannerStyle,
  BioLinksConfig,
  BioLinksNichePreset,
  ButtonFill,
  ButtonShape,
} from '../types/catalog';
import { phoneToDDI } from './format';
import {
  getContrastTextColor,
  getRelativeLuminance,
  hexToRgba,
} from './storeTheme';

export { getContrastTextColor, hexToRgba };

export const DEFAULT_BIO_LINKS_CONFIG: BioLinksConfig = {
  enabled: false,
  inheritStoreTheme: true,
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

function normalizeButtonShape(raw?: string): ButtonShape | undefined {
  if (raw === 'professional' || raw === 'modern' || raw === 'relaxed') {
    return raw;
  }
  return undefined;
}

function normalizeButtonFill(raw?: string): ButtonFill | undefined {
  if (raw === 'solid' || raw === 'outline') {
    return raw;
  }
  return undefined;
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
    inheritStoreTheme: raw.inheritStoreTheme !== false,
    theme:
      raw.theme === 'brand-soft' || raw.theme === 'dark-glass'
        ? raw.theme
        : 'minimal',
    buttonStyle:
      raw.buttonStyle === 'pill' || raw.buttonStyle === 'outline'
        ? raw.buttonStyle
        : 'card',
    buttonShape: normalizeButtonShape(raw.buttonShape),
    buttonFill: normalizeButtonFill(raw.buttonFill),
    bgColor:
      typeof raw.bgColor === 'string' && raw.bgColor.trim()
        ? raw.bgColor.trim()
        : undefined,
    primaryColor:
      typeof raw.primaryColor === 'string' && raw.primaryColor.trim()
        ? raw.primaryColor.trim()
        : undefined,
    storeAppearance: raw.storeAppearance,
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

export function getEffectiveOutlineColor(hex: string, isDarkTheme: boolean): string {
  if (!isDarkTheme) return hex;
  return getRelativeLuminance(hex) < 0.2 ? '#E4E4E7' : hex;
}
