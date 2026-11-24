import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import type {
  ButtonFill,
  ButtonShape,
  NichePreset,
  StoreAppearanceConfig,
} from '../types/catalog';
import {
  CURATED_BG_COLORS,
  CURATED_PRIMARY_COLORS,
  getContrastTextColor,
  hexToRgba,
} from '../utils/storeTheme';

export interface AppearanceControlsProps {
  value: StoreAppearanceConfig;
  onChange: (next: StoreAppearanceConfig) => void;
  disabled?: boolean;
  allowRelaxedShape?: boolean;
}

type AppearanceTab = 'background' | 'buttons';

const NICHE_OPTIONS: Array<{ id: NichePreset; label: string }> = [
  { id: 'default', label: 'Padrão' },
  { id: 'bakery', label: 'Confeitaria' },
  { id: 'petshop', label: 'Petshop' },
  { id: 'fashion', label: 'Moda' },
  { id: 'delivery', label: 'Delivery' },
];

const SHAPE_OPTIONS: Array<{
  id: ButtonShape;
  label: string;
  previewClass: string;
}> = [
  { id: 'professional', label: 'Profissional', previewClass: 'rounded-lg' },
  { id: 'modern', label: 'Moderno', previewClass: 'rounded-2xl' },
  { id: 'relaxed', label: 'Descontraído', previewClass: 'rounded-full' },
];

const FILL_OPTIONS: Array<{ id: ButtonFill; label: string }> = [
  { id: 'solid', label: 'Sólido' },
  { id: 'outline', label: 'Contorno' },
];

/**
 * Editor visual compartilhado de aparência:
 * 2 abas (Fundo | Botões) + seletor 1-clique de Estilo do Negócio.
 */
export function AppearanceControls({
  value,
  onChange,
  disabled = false,
  allowRelaxedShape = true,
}: AppearanceControlsProps) {
  const [activeTab, setActiveTab] = useState<AppearanceTab>('background');
  const bgColorInputRef = useRef<HTMLInputElement | null>(null);
  const primaryColorInputRef = useRef<HTMLInputElement | null>(null);
  const bgSwatchRef = useRef<HTMLButtonElement | null>(null);
  const primarySwatchRef = useRef<HTMLButtonElement | null>(null);

  const bgColor = (value.bgColor || '#FAFAFA').toUpperCase();
  const primaryColor = (value.primaryColor || '#E11D48').toUpperCase();
  const buttonShape: ButtonShape = value.buttonShape || 'modern';
  const buttonFill: ButtonFill = value.buttonFill || 'solid';
  const nichePreset: NichePreset = value.nichePreset || 'default';

  const bgDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef({
    value,
    bgColor,
    primaryColor,
    buttonShape,
    buttonFill,
    nichePreset,
    disabled,
    onChange,
  });
  latestStateRef.current = {
    value,
    bgColor,
    primaryColor,
    buttonShape,
    buttonFill,
    nichePreset,
    disabled,
    onChange,
  };

  const textOnPrimary = getContrastTextColor(primaryColor);

  const isCustomBg = !CURATED_BG_COLORS.some(
    (c) => c.hex.toUpperCase() === bgColor
  );
  const isCustomPrimary = !CURATED_PRIMARY_COLORS.some(
    (c) => c.hex.toUpperCase() === primaryColor
  );

  const update = useCallback((patch: Partial<StoreAppearanceConfig>) => {
    const s = latestStateRef.current;
    if (s.disabled) return;
    s.onChange({
      ...s.value,
      bgColor: s.bgColor,
      primaryColor: s.primaryColor,
      buttonShape: s.buttonShape,
      buttonFill: s.buttonFill,
      nichePreset: s.nichePreset,
      ...patch,
    });
  }, []);

  useEffect(() => {
    const input = bgColorInputRef.current;
    if (input && document.activeElement !== input) {
      input.value = bgColor;
    }
  }, [bgColor]);

  useEffect(() => {
    const input = primaryColorInputRef.current;
    if (input && document.activeElement !== input) {
      input.value = primaryColor;
    }
  }, [primaryColor]);

  const flushBgColor = useCallback(() => {
    if (bgDebounceRef.current) {
      clearTimeout(bgDebounceRef.current);
      bgDebounceRef.current = null;
    }
    const raw = bgColorInputRef.current?.value;
    if (!raw) return;
    const normalized = raw.toUpperCase();
    if (normalized !== latestStateRef.current.bgColor) {
      startTransition(() => update({ bgColor: normalized }));
    }
  }, [update]);

  const flushPrimaryColor = useCallback(() => {
    if (primaryDebounceRef.current) {
      clearTimeout(primaryDebounceRef.current);
      primaryDebounceRef.current = null;
    }
    const raw = primaryColorInputRef.current?.value;
    if (!raw) return;
    const normalized = raw.toUpperCase();
    if (normalized !== latestStateRef.current.primaryColor) {
      startTransition(() => update({ primaryColor: normalized }));
    }
  }, [update]);

  useEffect(() => {
    const input = bgColorInputRef.current;
    if (!input) return;

    const handleInput = () => {
      const normalized = input.value.toUpperCase();
      if (bgSwatchRef.current) {
        bgSwatchRef.current.style.backgroundColor = normalized;
        bgSwatchRef.current.style.color = getContrastTextColor(normalized);
      }
      if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);
      bgDebounceRef.current = setTimeout(() => {
        bgDebounceRef.current = null;
        startTransition(() => update({ bgColor: normalized }));
      }, 250);
    };

    const handleChange = () => {
      flushBgColor();
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('change', handleChange);
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('change', handleChange);
    };
  }, [activeTab, update, flushBgColor]);

  useEffect(() => {
    const input = primaryColorInputRef.current;
    if (!input) return;

    const handleInput = () => {
      const normalized = input.value.toUpperCase();
      if (primarySwatchRef.current) {
        primarySwatchRef.current.style.backgroundColor = normalized;
        primarySwatchRef.current.style.borderColor = normalized;
        primarySwatchRef.current.style.color = getContrastTextColor(normalized);
      }
      if (primaryDebounceRef.current) clearTimeout(primaryDebounceRef.current);
      primaryDebounceRef.current = setTimeout(() => {
        primaryDebounceRef.current = null;
        startTransition(() => update({ primaryColor: normalized }));
      }, 250);
    };

    const handleChange = () => {
      flushPrimaryColor();
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('change', handleChange);
    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('change', handleChange);
    };
  }, [activeTab, update, flushPrimaryColor]);

  useEffect(() => {
    return () => {
      if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);
      if (primaryDebounceRef.current) clearTimeout(primaryDebounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Seletor 1-clique: Estilo do seu Negócio */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
          Estilo do seu Negócio
        </p>
        <div className="flex flex-wrap gap-2">
          {NICHE_OPTIONS.map((niche) => {
            const active = nichePreset === niche.id;
            return (
              <button
                key={niche.id}
                type="button"
                disabled={disabled}
                onClick={() => update({ nichePreset: niche.id })}
                className={`px-3 py-2 min-h-[38px] rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                  disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
                style={
                  active
                    ? {
                        backgroundColor: hexToRgba(primaryColor, 0.12),
                        borderColor: primaryColor,
                        color: primaryColor,
                      }
                    : {
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E4E4E7',
                        color: '#52525B',
                      }
                }
              >
                {niche.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Abas: Fundo | Botões */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-100">
        {(
          [
            { id: 'background', label: 'Fundo' },
            { id: 'buttons', label: 'Botões' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
              style={
                active
                  ? {
                      backgroundColor: primaryColor,
                      color: textOnPrimary,
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: '#52525B',
                    }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Aba Fundo */}
      {activeTab === 'background' && (
        <div>
          <p className="text-xs font-medium text-zinc-600 mb-2.5">
            Cor de fundo da página
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {CURATED_BG_COLORS.map((option) => {
              const active = bgColor === option.hex.toUpperCase();
              const checkColor = getContrastTextColor(option.hex);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  title={option.name}
                  aria-label={option.name}
                  onClick={() => update({ bgColor: option.hex })}
                  className={`h-10 w-10 rounded-full flex items-center justify-center border transition-transform ${
                    disabled
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: option.hex,
                    borderColor: active ? primaryColor : '#D4D4D8',
                    boxShadow: active
                      ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${primaryColor}`
                      : undefined,
                  }}
                >
                  {active && (
                    <Check
                      className="h-4 w-4"
                      style={{ color: checkColor }}
                      strokeWidth={3}
                    />
                  )}
                </button>
              );
            })}

            {/* 9ª bolinha: seletor customizado nativo */}
            <div className="relative">
              <button
                ref={bgSwatchRef}
                type="button"
                disabled={disabled}
                title="Escolher outra cor de fundo"
                aria-label="Escolher outra cor de fundo"
                onClick={() => bgColorInputRef.current?.click()}
                className={`h-10 w-10 rounded-full flex items-center justify-center border transition-transform ${
                  disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:scale-105'
                }`}
                style={{
                  backgroundColor: isCustomBg ? bgColor : '#F4F4F5',
                  borderColor: isCustomBg ? primaryColor : '#D4D4D8',
                  color: isCustomBg ? getContrastTextColor(bgColor) : '#52525B',
                  boxShadow: isCustomBg
                    ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${primaryColor}`
                    : undefined,
                }}
              >
                <Palette className="h-4 w-4" />
              </button>
              <input
                ref={bgColorInputRef}
                type="color"
                defaultValue={bgColor}
                disabled={disabled}
                onBlur={flushBgColor}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Botões */}
      {activeTab === 'buttons' && (
        <div className="space-y-4">
          {/* Cores primárias */}
          <div>
            <p className="text-xs font-medium text-zinc-600 mb-2.5">
              Cor principal dos botões e destaques
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {CURATED_PRIMARY_COLORS.map((option) => {
                const active = primaryColor === option.hex.toUpperCase();
                const checkColor = getContrastTextColor(option.hex);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    title={option.name}
                    aria-label={option.name}
                    onClick={() => update({ primaryColor: option.hex })}
                    className={`h-10 w-10 rounded-full flex items-center justify-center border transition-transform ${
                      disabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: option.hex,
                      borderColor: active ? option.hex : 'rgba(0,0,0,0.08)',
                      boxShadow: active
                        ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${option.hex}`
                        : undefined,
                    }}
                  >
                    {active && (
                      <Check
                        className="h-4 w-4"
                        style={{ color: checkColor }}
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}

              {/* 9ª bolinha: seletor customizado nativo */}
              <div className="relative">
                <button
                  ref={primarySwatchRef}
                  type="button"
                  disabled={disabled}
                  title="Escolher outra cor principal"
                  aria-label="Escolher outra cor principal"
                  onClick={() => primaryColorInputRef.current?.click()}
                  className={`h-10 w-10 rounded-full flex items-center justify-center border transition-transform ${
                    disabled
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: isCustomPrimary ? primaryColor : '#F4F4F5',
                    borderColor: isCustomPrimary ? primaryColor : '#D4D4D8',
                    color: isCustomPrimary
                      ? getContrastTextColor(primaryColor)
                      : '#52525B',
                    boxShadow: isCustomPrimary
                      ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${primaryColor}`
                      : undefined,
                  }}
                >
                  <Palette className="h-4 w-4" />
                </button>
                <input
                  ref={primaryColorInputRef}
                  type="color"
                  defaultValue={primaryColor}
                  disabled={disabled}
                  onBlur={flushPrimaryColor}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Formato dos botões */}
          <div>
            <p className="text-xs font-medium text-zinc-600 mb-2">
              Formato dos botões
            </p>
            <div className={`grid gap-2 ${allowRelaxedShape ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {(allowRelaxedShape
                ? SHAPE_OPTIONS
                : SHAPE_OPTIONS.filter((opt) => opt.id !== 'relaxed')
              ).map((option) => {
                const active = buttonShape === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => update({ buttonShape: option.id })}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      disabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: hexToRgba(primaryColor, 0.08),
                            borderColor: primaryColor,
                          }
                        : {
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E4E4E7',
                          }
                    }
                  >
                    <span
                      className={`w-full h-5 block ${option.previewClass}`}
                      style={{
                        backgroundColor: active ? primaryColor : '#D4D4D8',
                      }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: active ? primaryColor : '#52525B' }}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preenchimento: Sólido vs Contorno */}
          <div>
            <p className="text-xs font-medium text-zinc-600 mb-2">
              Estilo de preenchimento
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FILL_OPTIONS.map((option) => {
                const active = buttonFill === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => update({ buttonFill: option.id })}
                    className={`py-2.5 px-3 min-h-[42px] rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                      disabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: primaryColor,
                            borderColor: primaryColor,
                            color: textOnPrimary,
                          }
                        : {
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E4E4E7',
                            color: '#52525B',
                          }
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
