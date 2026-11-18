export type ThemeId = 'rose' | 'red' | 'amber' | 'emerald' | 'purple' | 'zinc';

export interface ThemePalette {
  id: ThemeId;
  name: string;
  shortName: string;
  hex: string;
  headerGradient: string;
  primaryBg: string;
  primaryHover: string;
  primaryText: string;
  buttonText: string;
  softBg: string;
  softText: string;
  softBorder: string;
  ringFocus: string;
  shadowColor: string;
  avatarFallbackBg: string;
  avatarFallbackText: string;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  rose: {
    id: 'rose',
    name: 'Rosa Confeitaria',
    shortName: 'Rosa',
    hex: '#E11D48',
    headerGradient: 'from-rose-600 to-pink-600',
    primaryBg: 'bg-rose-600',
    primaryHover: 'hover:bg-rose-700',
    primaryText: 'text-rose-600',
    buttonText: 'text-white',
    softBg: 'bg-rose-50',
    softText: 'text-rose-700',
    softBorder: 'border-rose-600',
    ringFocus: 'focus:border-rose-500 focus:ring-rose-500/20',
    shadowColor: 'shadow-rose-600/20',
    avatarFallbackBg: 'bg-rose-100',
    avatarFallbackText: 'text-rose-700',
  },
  red: {
    id: 'red',
    name: 'Vermelho Festivo',
    shortName: 'Vermelho',
    hex: '#DC2626',
    headerGradient: 'from-red-600 to-rose-700',
    primaryBg: 'bg-red-600',
    primaryHover: 'hover:bg-red-700',
    primaryText: 'text-red-600',
    buttonText: 'text-white',
    softBg: 'bg-red-50',
    softText: 'text-red-700',
    softBorder: 'border-red-600',
    ringFocus: 'focus:border-red-500 focus:ring-red-500/20',
    shadowColor: 'shadow-red-600/20',
    avatarFallbackBg: 'bg-red-100',
    avatarFallbackText: 'text-red-700',
  },
  amber: {
    id: 'amber',
    name: 'Dourado Artesanal',
    shortName: 'Dourado',
    hex: '#D97706',
    headerGradient: 'from-amber-600 to-orange-600',
    primaryBg: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-700',
    primaryText: 'text-amber-600',
    buttonText: 'text-white',
    softBg: 'bg-amber-50',
    softText: 'text-amber-800',
    softBorder: 'border-amber-600',
    ringFocus: 'focus:border-amber-500 focus:ring-amber-500/20',
    shadowColor: 'shadow-amber-600/20',
    avatarFallbackBg: 'bg-amber-100',
    avatarFallbackText: 'text-amber-800',
  },
  emerald: {
    id: 'emerald',
    name: 'Verde Esmeralda',
    shortName: 'Esmeralda',
    hex: '#059669',
    headerGradient: 'from-emerald-600 to-teal-700',
    primaryBg: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    primaryText: 'text-emerald-600',
    buttonText: 'text-white',
    softBg: 'bg-emerald-50',
    softText: 'text-emerald-800',
    softBorder: 'border-emerald-600',
    ringFocus: 'focus:border-emerald-500 focus:ring-emerald-500/20',
    shadowColor: 'shadow-emerald-600/20',
    avatarFallbackBg: 'bg-emerald-100',
    avatarFallbackText: 'text-emerald-800',
  },
  purple: {
    id: 'purple',
    name: 'Roxo Açaí & Doces',
    shortName: 'Roxo',
    hex: '#7C3AED',
    headerGradient: 'from-violet-600 to-purple-700',
    primaryBg: 'bg-violet-600',
    primaryHover: 'hover:bg-violet-700',
    primaryText: 'text-violet-600',
    buttonText: 'text-white',
    softBg: 'bg-violet-50',
    softText: 'text-violet-800',
    softBorder: 'border-violet-600',
    ringFocus: 'focus:border-violet-500 focus:ring-violet-500/20',
    shadowColor: 'shadow-violet-600/20',
    avatarFallbackBg: 'bg-violet-100',
    avatarFallbackText: 'text-violet-800',
  },
  zinc: {
    id: 'zinc',
    name: 'Preto Minimalista',
    shortName: 'Minimalista',
    hex: '#18181B',
    headerGradient: 'from-zinc-900 to-stone-800',
    primaryBg: 'bg-zinc-900',
    primaryHover: 'hover:bg-zinc-800',
    primaryText: 'text-zinc-900',
    buttonText: 'text-white',
    softBg: 'bg-zinc-100',
    softText: 'text-zinc-900',
    softBorder: 'border-zinc-900',
    ringFocus: 'focus:border-zinc-800 focus:ring-zinc-800/20',
    shadowColor: 'shadow-zinc-900/20',
    avatarFallbackBg: 'bg-zinc-200',
    avatarFallbackText: 'text-zinc-900',
  },
};

export const THEME_LIST: ThemePalette[] = [
  THEMES.rose,
  THEMES.red,
  THEMES.amber,
  THEMES.emerald,
  THEMES.purple,
  THEMES.zinc,
];

export function getTheme(themeColor?: string | null): ThemePalette {
  if (themeColor && themeColor in THEMES) {
    return THEMES[themeColor as ThemeId];
  }
  return THEMES.rose;
}

export function getStoreInitials(storeName: string): string {
  const cleaned = storeName.trim();
  if (!cleaned) return 'VM';

  const ignore = new Set(['da', 'de', 'do', 'das', 'dos', 'e', '&']);
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 0 && !ignore.has(w.toLowerCase()));

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}
