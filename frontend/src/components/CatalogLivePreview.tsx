import { memo } from 'react';
import { Calendar, Info, MapPin, Plus, Truck } from 'lucide-react';
import type { StoreAppearanceConfig } from '../types/catalog';
import { getStoreInitials, type ThemeId } from '../constants/themes';
import { formatCurrency, parsePriceToCents } from '../utils/format';
import { filterActiveDeliverySlots } from '../utils/deliverySchedule';
import {
  getNichePatternStyle,
  hexToRgba,
  resolveStoreTheme,
} from '../utils/storeTheme';
import logoIcon from '../assets/logo-icon.png';

export interface PreviewProductItem {
  localId: string;
  name: string;
  description: string;
  priceInput: string;
  available: boolean;
  imageUrl?: string | null;
}

interface CatalogLivePreviewProps {
  storeName: string;
  logoUrl: string | null;
  themeColor: ThemeId | string;
  storeAppearance?: StoreAppearanceConfig | null;
  depositPct: number;
  paymentNotice?: string;
  deliveryDates: string[];
  notes: string;
  pickupAddress: string;
  deliveryEstimate: string;
  products: PreviewProductItem[];
}

export const CatalogLivePreview = memo(function CatalogLivePreview({
  storeName,
  logoUrl,
  themeColor,
  storeAppearance,
  depositPct: _depositPct,
  paymentNotice,
  deliveryDates,
  notes,
  pickupAddress,
  deliveryEstimate,
  products,
}: CatalogLivePreviewProps) {
  const displayTitle = storeName.trim() || 'Sua Vitrine';
  const resolvedTheme = resolveStoreTheme(themeColor, storeAppearance);
  const nichePatternStyle = getNichePatternStyle(
    resolvedTheme.nichePreset,
    resolvedTheme.primaryColor,
    resolvedTheme.isDark
  );
  const initials = getStoreInitials(displayTitle);
  const activeDates = filterActiveDeliverySlots(deliveryDates);

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
      className="mx-auto w-full max-w-[350px] overflow-hidden rounded-[2.25rem] border-[7px] border-[#18181B] bg-stone-50 shadow-xl"
    >
      {/* Barra superior discreta */}
      <div className="flex items-center justify-center gap-1.5 bg-[#18181B] pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Prévia ao vivo
      </div>

      {/* Conteúdo rolável */}
      <div
        style={{
          backgroundColor: resolvedTheme.bgColor,
          color: resolvedTheme.textColor,
        }}
        className="relative h-[560px] overflow-y-auto pb-14"
      >
        {nichePatternStyle && (
          <div
            aria-hidden="true"
            style={nichePatternStyle}
            className="pointer-events-none absolute inset-0"
          />
        )}

        {/* Header da vitrine */}
        <div
          style={{
            background: `linear-gradient(135deg, ${resolvedTheme.primaryColor} 0%, ${hexToRgba(resolvedTheme.primaryColor, 0.85)} 100%)`,
            color: resolvedTheme.textOnPrimary,
          }}
          className="relative z-10 px-4 py-5"
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo da vitrine ${displayTitle}`}
                className="h-12 w-12 shrink-0 rounded-full border-2 border-white/85 bg-white object-cover shadow-md"
              />
            ) : (
              <div
                style={{
                  backgroundColor: resolvedTheme.surfaceColor,
                  color: resolvedTheme.primaryColor,
                }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/85 shadow-md"
              >
                <span className="text-sm font-black tracking-tight">
                  {initials}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold leading-tight">
                {displayTitle}
              </p>
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
          {/* Datas / Turnos ativos (sem vencidas) */}
          {activeDates.length > 0 && (
            <div
              style={{
                backgroundColor: resolvedTheme.surfaceColor,
                borderColor: resolvedTheme.borderColor,
              }}
              className={`${resolvedTheme.radiusClass} border p-2.5`}
            >
              <div
                style={{ color: resolvedTheme.textMutedColor }}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
              >
                <Calendar
                  style={{ color: resolvedTheme.outlineColor }}
                  className="h-3.5 w-3.5"
                />
                Datas e turnos disponíveis
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {activeDates.map((date) => (
                  <span
                    key={date}
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

          {/* Modalidades: Entrega / Retirada */}
          {(pickupAddress.trim() || deliveryEstimate.trim()) && (
            <div
              style={{
                backgroundColor: resolvedTheme.surfaceColor,
                borderColor: resolvedTheme.borderColor,
                color: resolvedTheme.textMutedColor,
              }}
              className={`space-y-1.5 ${resolvedTheme.radiusClass} border p-2.5 text-[11px]`}
            >
              {pickupAddress.trim() && (
                <div className="flex items-start gap-1.5">
                  <MapPin
                    style={{ color: resolvedTheme.outlineColor }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  />
                  <span>
                    <strong style={{ color: resolvedTheme.textColor }}>
                      Retirada:
                    </strong>{' '}
                    {pickupAddress.trim()}
                  </span>
                </div>
              )}
              {deliveryEstimate.trim() && (
                <div className="flex items-start gap-1.5">
                  <Truck
                    style={{ color: resolvedTheme.outlineColor }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  />
                  <span>
                    <strong style={{ color: resolvedTheme.textColor }}>
                      Entrega:
                    </strong>{' '}
                    {deliveryEstimate.trim()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Avisos */}
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

          {/* Produtos */}
          <div className="space-y-2">
            <p
              style={{ color: resolvedTheme.textMutedColor }}
              className="text-[11px] font-bold uppercase tracking-wider"
            >
              Produtos para Encomenda
            </p>

            {products.length === 0 ? (
              <div
                style={{
                  backgroundColor: resolvedTheme.surfaceColor,
                  borderColor: resolvedTheme.borderColor,
                  color: resolvedTheme.textMutedColor,
                }}
                className={`${resolvedTheme.radiusClass} border border-dashed p-5 text-center text-xs`}
              >
                Adicione produtos para visualizar na prévia
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
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={
                            product.name.trim()
                              ? `Foto de ${product.name.trim()} na vitrine ${displayTitle}`
                              : `Foto de produto da vitrine ${displayTitle}`
                          }
                          loading="lazy"
                          decoding="async"
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
                        <p
                          style={{ color: resolvedTheme.textColor }}
                          className="truncate text-xs font-bold"
                        >
                          {product.name.trim() || 'Nome do produto'}
                        </p>
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
                          <span className="inline-flex items-center rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-500">
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

      {/* Rodapé mockup */}
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
});
