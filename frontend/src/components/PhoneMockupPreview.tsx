import { Info, Calendar, Plus } from 'lucide-react';
import type {
  DraftProductItem,
  StoreAppearanceConfig,
} from '../types/catalog';
import { getStoreInitials, type ThemeId } from '../constants/themes';
import { formatCurrency, parsePriceToCents } from '../utils/format';
import {
  getNichePatternStyle,
  hexToRgba,
  resolveStoreTheme,
} from '../utils/storeTheme';
import logoIcon from '../assets/logo-icon.png';

interface PhoneMockupPreviewProps {
  storeName: string;
  logoPreviewUrl?: string | null;
  themeColor: ThemeId | string;
  storeAppearance?: StoreAppearanceConfig | null;
  notes: string;
  deliveryDates: string[];
  depositPct: number;
  paymentNotice?: string;
  products: DraftProductItem[];
}

export function PhoneMockupPreview({
  storeName,
  logoPreviewUrl,
  themeColor,
  storeAppearance,
  notes,
  deliveryDates,
  depositPct: _depositPct,
  paymentNotice,
  products,
}: PhoneMockupPreviewProps) {
  const displayTitle = storeName.trim() || 'Sua Loja de Encomendas';
  const resolvedTheme = resolveStoreTheme(themeColor, storeAppearance);
  const nichePatternStyle = getNichePatternStyle(
    resolvedTheme.nichePreset,
    resolvedTheme.primaryColor,
    resolvedTheme.isDark
  );
  const initials = getStoreInitials(displayTitle);

  const isOutline = resolvedTheme.buttonFill === 'outline';
  const actionButtonStyle = isOutline
    ? {
        backgroundColor: 'transparent',
        borderWidth: '2px',
        borderStyle: 'solid' as const,
        borderColor: resolvedTheme.outlineColor,
        color: resolvedTheme.outlineColor,
      }
    : {
        backgroundColor: resolvedTheme.primaryColor,
        color: resolvedTheme.textOnPrimary,
      };

  return (
    <div
      style={resolvedTheme.cssVars}
      className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.5rem] border-[8px] border-stone-900 bg-stone-50 shadow-2xl"
    >
      {/* Notch */}
      <div className="flex justify-center bg-stone-900 pb-2 pt-1">
        <div className="h-4 w-24 rounded-full bg-stone-800" />
      </div>

      {/* Screen Content */}
      <div
        style={{
          backgroundColor: resolvedTheme.bgColor,
          color: resolvedTheme.textColor,
        }}
        className="relative h-[560px] overflow-y-auto pb-16"
      >
        {nichePatternStyle && (
          <div
            aria-hidden="true"
            style={nichePatternStyle}
            className="pointer-events-none absolute inset-0"
          />
        )}

        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${resolvedTheme.primaryColor} 0%, ${hexToRgba(resolvedTheme.primaryColor, 0.85)} 100%)`,
            color: resolvedTheme.textOnPrimary,
          }}
          className="relative z-10 px-4 py-5"
        >
          <div className="flex items-center gap-3">
            {logoPreviewUrl ? (
              <img
                src={logoPreviewUrl}
                alt={`Logo da vitrine ${displayTitle}`}
                className="h-12 w-12 shrink-0 rounded-full border-2 border-white/80 bg-white object-cover shadow-md"
              />
            ) : (
              <div
                style={{
                  backgroundColor: resolvedTheme.surfaceColor,
                  color: resolvedTheme.primaryColor,
                }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/80 shadow-md"
              >
                <span className="text-sm font-black tracking-tight">
                  {initials}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold leading-tight">
                {displayTitle}
              </h3>
              {paymentNotice?.trim() && (
                <p
                  style={{ color: hexToRgba(resolvedTheme.textOnPrimary, 0.9) }}
                  className="mt-0.5 text-[11px]"
                >
                  {paymentNotice}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-3 p-3">
          {/* Delivery dates */}
          {deliveryDates.length > 0 && (
            <div
              style={{
                backgroundColor: resolvedTheme.surfaceColor,
                borderColor: resolvedTheme.borderColor,
              }}
              className={`${resolvedTheme.radiusClass} border p-2.5`}
            >
              <div
                style={{ color: resolvedTheme.textMutedColor }}
                className="flex items-center gap-1.5 text-[11px] font-semibold"
              >
                <Calendar
                  style={{ color: resolvedTheme.outlineColor }}
                  className="h-3.5 w-3.5"
                />
                Datas e turnos disponíveis
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {deliveryDates.map((date, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: hexToRgba(
                        resolvedTheme.primaryColor,
                        resolvedTheme.isDark ? 0.2 : 0.1
                      ),
                      color: resolvedTheme.isDark
                        ? '#FAFAFA'
                        : resolvedTheme.outlineColor,
                    }}
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  >
                    {date}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes.trim() && (
            <div
              className={`flex items-start gap-2 ${resolvedTheme.radiusClass} border p-2.5 text-[11px] ${
                resolvedTheme.isDark
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <Info
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                  resolvedTheme.isDark ? 'text-amber-400' : 'text-amber-600'
                }`}
              />
              <p className="whitespace-pre-line leading-relaxed">{notes}</p>
            </div>
          )}

          {/* Product List */}
          <div className="space-y-2">
            <p
              style={{ color: resolvedTheme.textMutedColor }}
              className="text-xs font-bold uppercase tracking-wider"
            >
              Vitrine de Produtos
            </p>
            {products.length === 0 ? (
              <div
                style={{
                  backgroundColor: resolvedTheme.surfaceColor,
                  borderColor: resolvedTheme.borderColor,
                  color: resolvedTheme.textMutedColor,
                }}
                className={`${resolvedTheme.radiusClass} border border-dashed p-6 text-center text-xs`}
              >
                Adicione produtos ao lado para visualizar aqui
              </div>
            ) : (
              products.map((product) => {
                const cents = parsePriceToCents(product.priceInput);
                const isAvailable = product.available !== false;
                return (
                  <div
                    key={product.localId}
                    style={{
                      backgroundColor: resolvedTheme.surfaceColor,
                      borderColor: resolvedTheme.borderColor,
                    }}
                    className={`flex gap-2.5 ${resolvedTheme.radiusClass} border p-2.5 shadow-2xs ${
                      isAvailable ? '' : 'opacity-75'
                    }`}
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      {product.previewDataUrl ? (
                        <img
                          src={product.previewDataUrl}
                          alt={
                            product.name.trim()
                              ? `Foto de ${product.name.trim()} na vitrine ${displayTitle}`
                              : `Foto de produto da vitrine ${displayTitle}`
                          }
                          className={`h-full w-full object-cover ${
                            isAvailable ? '' : 'grayscale'
                          }`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-stone-400">
                          Sem foto
                        </div>
                      )}
                      {!isAvailable && (
                        <span className="absolute inset-x-0 bottom-0 bg-stone-900/85 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-wide text-white">
                          Esgotado
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <p
                            style={{ color: resolvedTheme.textColor }}
                            className="truncate text-xs font-bold"
                          >
                            {product.name.trim() || 'Nome do produto'}
                          </p>
                          {!isAvailable && (
                            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                              Esgotado
                            </span>
                          )}
                        </div>
                        {product.description.trim() && (
                          <p
                            style={{ color: resolvedTheme.textMutedColor }}
                            className="line-clamp-2 text-[10px]"
                          >
                            {product.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span
                          style={{ color: resolvedTheme.textColor }}
                          className="text-xs font-extrabold"
                        >
                          {formatCurrency(cents)}
                        </span>
                        {isAvailable ? (
                          <span
                            style={actionButtonStyle}
                            className={`inline-flex items-center gap-0.5 ${resolvedTheme.radiusClass} px-2.5 py-0.5 text-[10px] font-bold`}
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar
                          </span>
                        ) : (
                          <span className="inline-flex cursor-not-allowed items-center rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                            Indisponível
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{ color: resolvedTheme.textMutedColor }}
            className="flex items-center justify-center gap-1 pt-2 text-[10px]"
          >
            <img src={logoIcon} alt="" className="h-3.5 w-3.5 object-contain" />
            <span>
              Vitrine criada com{' '}
              <strong style={{ color: resolvedTheme.textColor }}>
                VitriMini
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar Mock */}
      <div
        style={{
          backgroundColor: resolvedTheme.surfaceColor,
          borderColor: resolvedTheme.borderColor,
        }}
        className="border-t px-4 py-2.5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              style={{ color: resolvedTheme.textMutedColor }}
              className="text-[10px]"
            >
              1 item selecionado
            </p>
            <p
              style={{ color: resolvedTheme.textColor }}
              className="text-xs font-extrabold"
            >
              {products[0]
                ? formatCurrency(parsePriceToCents(products[0].priceInput))
                : 'R$ 0,00'}
            </p>
          </div>
          <div
            style={actionButtonStyle}
            className={`${resolvedTheme.radiusClass} px-3 py-1.5 text-[11px] font-bold`}
          >
            Finalizar Pedido
          </div>
        </div>
      </div>
    </div>
  );
}
