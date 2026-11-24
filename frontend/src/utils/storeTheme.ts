import type { CSSProperties } from 'react';
import { getTheme } from '../constants/themes';
import type {
  BioLinksConfig,
  ButtonFill,
  ButtonShape,
  NichePreset,
  StoreAppearanceConfig,
} from '../types/catalog';

export interface CuratedColorOption {
  id: string;
  name: string;
  hex: string;
}

export const CURATED_BG_COLORS: CuratedColorOption[] = [
  { id: 'off-white', name: 'Off-white', hex: '#FAFAFA' },
  { id: 'bakery-cream', name: 'Creme Confeitaria', hex: '#FFFBF2' },
  { id: 'soft-rose', name: 'Rosa Suave', hex: '#FFF5F7' },
  { id: 'sage-green', name: 'Verde Sálvia', hex: '#F3F7F4' },
  { id: 'serene-blue', name: 'Azul Sereno', hex: '#F3F6FA' },
  { id: 'graphite', name: 'Grafite', hex: '#18181B' },
  { id: 'elegant-black', name: 'Preto Elegante', hex: '#09090B' },
  { id: 'soft-terracotta', name: 'Terracota Suave', hex: '#FDF6F2' },
];

export const CURATED_PRIMARY_COLORS: CuratedColorOption[] = [
  { id: 'rose', name: 'Rosa', hex: '#E11D48' },
  { id: 'red', name: 'Vermelho', hex: '#DC2626' },
  { id: 'amber', name: 'Dourado', hex: '#D97706' },
  { id: 'emerald', name: 'Esmeralda', hex: '#059669' },
  { id: 'purple', name: 'Roxo', hex: '#7C3AED' },
  { id: 'blue', name: 'Azul Royal', hex: '#2563EB' },
  { id: 'terracotta', name: 'Terracota', hex: '#EA580C' },
  { id: 'zinc', name: 'Grafite', hex: '#18181B' },
];

export interface ResolvedStoreTheme {
  bgColor: string;
  surfaceColor: string;
  primaryColor: string;
  textColor: string;
  textMutedColor: string;
  textOnPrimary: '#FFFFFF' | '#18181B';
  borderColor: string;
  outlineColor: string;
  isDark: boolean;
  buttonShape: ButtonShape;
  buttonFill: ButtonFill;
  nichePreset: NichePreset;
  radiusClass: 'rounded-lg' | 'rounded-2xl' | 'rounded-full';
  radiusPx: '8px' | '16px' | '9999px';
  cssVars: CSSProperties;
}

function normalizeHex(hex?: string | null): string | null {
  if (!hex) return null;
  const raw = hex.trim();
  const clean = raw.startsWith('#') ? raw.slice(1) : raw;
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return `#${expanded.toUpperCase()}`;
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const clean = normalized.slice(1);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function toLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Calcula a luminância relativa WCAG (0 = preto, 1 = branco).
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Retorna '#FFFFFF' ou '#18181B' garantindo contraste legível sobre a cor informada.
 */
export function getContrastTextColor(hex: string): '#FFFFFF' | '#18181B' {
  const luminance = getRelativeLuminance(hex);
  return luminance > 0.42 ? '#18181B' : '#FFFFFF';
}

/**
 * Converte um hex (#RGB ou #RRGGBB) para rgba(..., alpha).
 */
export function hexToRgba(hex: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const rgb = parseHexRgb(hex);
  if (!rgb) {
    return `rgba(24, 24, 27, ${safeAlpha})`;
  }
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${safeAlpha})`;
}

function resolveButtonShape(shape?: string | null): ButtonShape {
  if (shape === 'professional' || shape === 'relaxed') return shape;
  return 'modern';
}

function resolveButtonFill(fill?: string | null): ButtonFill {
  return fill === 'outline' ? 'outline' : 'solid';
}

function resolveNichePreset(niche?: string | null): NichePreset {
  if (
    niche === 'bakery' ||
    niche === 'petshop' ||
    niche === 'fashion' ||
    niche === 'delivery'
  ) {
    return niche;
  }
  return 'default';
}

/**
 * Resolve o tema completo da vitrine (cores, contraste, raios e CSS Variables).
 */
export function resolveStoreTheme(
  themeColor?: string | null,
  appearance?: Partial<StoreAppearanceConfig> | null
): ResolvedStoreTheme {
  const fallbackHex = getTheme(themeColor).hex;
  const primaryColor = normalizeHex(appearance?.primaryColor) ?? fallbackHex;
  const bgColor = normalizeHex(appearance?.bgColor) ?? '#FAFAFA';
  const isDark = getRelativeLuminance(bgColor) < 0.2;

  const surfaceColor = isDark
    ? bgColor === '#09090B'
      ? '#18181B'
      : '#27272A'
    : '#FFFFFF';

  const textColor = isDark ? '#FAFAFA' : '#18181B';
  const textMutedColor = isDark ? '#A1A1AA' : '#52525B';
  const textOnPrimary = getContrastTextColor(primaryColor);
  const borderColor = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(24, 24, 27, 0.10)';

  // Garante contraste mínimo 3:1 para botões/bordas outline contra o fundo
  const outlineColor =
    getContrastRatio(primaryColor, bgColor) >= 3.0
      ? primaryColor
      : isDark
        ? '#F4F4F5'
        : '#18181B';

  const buttonShape = resolveButtonShape(appearance?.buttonShape);
  const buttonFill = resolveButtonFill(appearance?.buttonFill);
  const nichePreset = resolveNichePreset(appearance?.nichePreset);

  const radiusClass =
    buttonShape === 'professional'
      ? 'rounded-lg'
      : buttonShape === 'relaxed'
        ? 'rounded-full'
        : 'rounded-2xl';

  const radiusPx =
    buttonShape === 'professional'
      ? '8px'
      : buttonShape === 'relaxed'
        ? '9999px'
        : '16px';

  const cssVars = {
    '--vm-bg': bgColor,
    '--vm-surface': surfaceColor,
    '--vm-primary': primaryColor,
    '--vm-text': textColor,
    '--vm-text-on-primary': textOnPrimary,
    '--vm-radius': radiusPx,
  } as CSSProperties;

  return {
    bgColor,
    surfaceColor,
    primaryColor,
    textColor,
    textMutedColor,
    textOnPrimary,
    borderColor,
    outlineColor,
    isDark,
    buttonShape,
    buttonFill,
    nichePreset,
    radiusClass,
    radiusPx,
    cssVars,
  };
}

/**
 * Resolve a aparência do VitriLink herdando da vitrine por padrão (inheritStoreTheme !== false),
 * com retrocompatibilidade total para configurações legadas (theme/buttonStyle).
 */
export function resolveVitriLinkAppearance(
  themeColor?: string | null,
  storeAppearance?: Partial<StoreAppearanceConfig> | null,
  bioLinksConfig?: Partial<BioLinksConfig> | null
): ResolvedStoreTheme {
  const inherit = bioLinksConfig?.inheritStoreTheme !== false;

  if (inherit) {
    return resolveStoreTheme(themeColor, {
      bgColor: storeAppearance?.bgColor,
      primaryColor: storeAppearance?.primaryColor ?? getTheme(themeColor).hex,
      buttonShape: storeAppearance?.buttonShape,
      buttonFill: storeAppearance?.buttonFill,
      nichePreset: storeAppearance?.nichePreset ?? bioLinksConfig?.nichePreset,
    });
  }

  const legacyBg =
    bioLinksConfig?.theme === 'dark-glass'
      ? '#18181B'
      : bioLinksConfig?.theme === 'brand-soft'
        ? '#FFF5F7'
        : undefined;

  const legacyShape: ButtonShape | undefined =
    bioLinksConfig?.buttonStyle === 'pill'
      ? 'relaxed'
      : bioLinksConfig?.buttonStyle === 'card'
        ? 'modern'
        : undefined;

  const legacyFill: ButtonFill | undefined =
    bioLinksConfig?.buttonStyle === 'outline' ? 'outline' : undefined;

  return resolveStoreTheme(themeColor, {
    bgColor: bioLinksConfig?.bgColor ?? legacyBg ?? storeAppearance?.bgColor,
    primaryColor:
      bioLinksConfig?.primaryColor ??
      storeAppearance?.primaryColor ??
      getTheme(themeColor).hex,
    buttonShape: bioLinksConfig?.buttonShape ?? legacyShape,
    buttonFill: bioLinksConfig?.buttonFill ?? legacyFill,
    nichePreset: bioLinksConfig?.nichePreset,
  });
}

/**
 * Gera textura sutil em CSS/SVG inline por nicho (opacity 0.04–0.08, zero dependências).
 */
export function getNichePatternStyle(
  niche?: NichePreset | null,
  accentHex = '#18181B',
  isDark = false
): CSSProperties | null {
  const resolved = resolveNichePreset(niche);
  if (resolved === 'default') return null;

  const strokeHex = isDark ? '#FFFFFF' : accentHex;
  const opacity = isDark ? 0.05 : 0.06;

  if (resolved === 'bakery') {
    return {
      backgroundImage: `radial-gradient(${hexToRgba(strokeHex, opacity)} 1.5px, transparent 1.5px), radial-gradient(${hexToRgba(strokeHex, opacity * 0.8)} 1.5px, transparent 1.5px)`,
      backgroundSize: '24px 24px',
      backgroundPosition: '0 0, 12px 12px',
    };
  }

  if (resolved === 'petshop') {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='${strokeHex}' fill-opacity='${opacity}'><circle cx='12' cy='14' r='2'/><circle cx='17' cy='11' r='2'/><circle cx='22' cy='14' r='2'/><ellipse cx='17' cy='20' rx='4.2' ry='3.2'/></g></svg>`;
    return {
      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      backgroundSize: '40px 40px',
    };
  }

  if (resolved === 'fashion') {
    return {
      backgroundImage: `linear-gradient(to right, ${hexToRgba(strokeHex, opacity * 0.75)} 1px, transparent 1px), linear-gradient(to bottom, ${hexToRgba(strokeHex, opacity * 0.75)} 1px, transparent 1px)`,
      backgroundSize: '28px 28px',
    };
  }

  // delivery
  return {
    backgroundImage: `repeating-linear-gradient(-45deg, ${hexToRgba(strokeHex, opacity)} 0px, ${hexToRgba(strokeHex, opacity)} 1.5px, transparent 1.5px, transparent 18px)`,
  };
}
