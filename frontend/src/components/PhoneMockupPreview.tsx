import { Info, Calendar, Plus } from 'lucide-react';
import type { DraftProductItem } from '../types/catalog';
import {
  getStoreInitials,
  getTheme,
  type ThemeId,
} from '../constants/themes';
import { formatCurrency, parsePriceToCents } from '../utils/format';
import logoIcon from '../assets/logo-icon.png';

interface PhoneMockupPreviewProps {
  storeName: string;
  logoPreviewUrl?: string | null;
  themeColor: ThemeId;
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
  notes,
  deliveryDates,
  depositPct: _depositPct,
  paymentNotice,
  products,
}: PhoneMockupPreviewProps) {
  const displayTitle = storeName.trim() || 'Sua Loja de Encomendas';
  const theme = getTheme(themeColor);
  const initials = getStoreInitials(displayTitle);

  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.5rem] border-[8px] border-stone-900 bg-stone-50 shadow-2xl">
      {/* Notch */}
      <div className="flex justify-center bg-stone-900 pb-2 pt-1">
        <div className="h-4 w-24 rounded-full bg-stone-800" />
      </div>

      {/* Screen Content */}
      <div className="h-[560px] overflow-y-auto bg-stone-50 pb-16">
        {/* Header */}
        <div className={`bg-gradient-to-br ${theme.headerGradient} px-4 py-5 text-white`}>
          <div className="flex items-center gap-3">
            {logoPreviewUrl ? (
              <img
                src={logoPreviewUrl}
                alt={`Logo da vitrine ${displayTitle}`}
                className="h-12 w-12 shrink-0 rounded-full border-2 border-white/80 bg-white object-cover shadow-md"
              />
            ) : (
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/80 shadow-md ${theme.avatarFallbackBg} ${theme.avatarFallbackText}`}
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
                <p className="mt-0.5 text-[11px] text-white/90">
                  {paymentNotice}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3">
          {/* Delivery dates */}
          {deliveryDates.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600">
                <Calendar className={`h-3.5 w-3.5 ${theme.primaryText}`} />
                Datas e turnos disponíveis
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {deliveryDates.map((date, idx) => (
                  <span
                    key={idx}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${theme.softBg} ${theme.softText}`}
                  >
                    {date}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes.trim() && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="whitespace-pre-line leading-relaxed">{notes}</p>
            </div>
          )}

          {/* Product List */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Vitrine de Produtos
            </p>
            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-xs text-stone-400">
                Adicione produtos ao lado para visualizar aqui
              </div>
            ) : (
              products.map((product) => {
                const cents = parsePriceToCents(product.priceInput);
                const isAvailable = product.available !== false;
                return (
                  <div
                    key={product.localId}
                    className={`flex gap-2.5 rounded-xl border border-stone-200 bg-white p-2.5 shadow-2xs ${
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
                          <p className="truncate text-xs font-bold text-stone-900">
                            {product.name.trim() || 'Nome do produto'}
                          </p>
                          {!isAvailable && (
                            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                              Esgotado
                            </span>
                          )}
                        </div>
                        {product.description.trim() && (
                          <p className="line-clamp-2 text-[10px] text-stone-500">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-stone-900">
                          {formatCurrency(cents)}
                        </span>
                        {isAvailable ? (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.primaryBg} ${theme.buttonText}`}
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

          <div className="flex items-center justify-center gap-1 pt-2 text-[10px] text-stone-400">
            <img src={logoIcon} alt="" className="h-3.5 w-3.5 object-contain" />
            <span>
              Vitrine criada com <strong>VitriMini</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar Mock */}
      <div className="border-t border-stone-200 bg-white px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-stone-400">1 item selecionado</p>
            <p className="text-xs font-extrabold text-stone-900">
              {products[0]
                ? formatCurrency(parsePriceToCents(products[0].priceInput))
                : 'R$ 0,00'}
            </p>
          </div>
          <div
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${theme.primaryBg} ${theme.buttonText}`}
          >
            Finalizar Pedido
          </div>
        </div>
      </div>
    </div>
  );
}
