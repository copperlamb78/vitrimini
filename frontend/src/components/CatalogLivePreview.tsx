import { memo } from 'react';
import { Calendar, Info, MapPin, Plus, Truck } from 'lucide-react';
import {
  getStoreInitials,
  getTheme,
  type ThemeId,
} from '../constants/themes';
import { formatCurrency, parsePriceToCents } from '../utils/format';
import { filterActiveDeliverySlots } from '../utils/deliverySchedule';
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
  themeColor: ThemeId;
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
  depositPct: _depositPct,
  paymentNotice,
  deliveryDates,
  notes,
  pickupAddress,
  deliveryEstimate,
  products,
}: CatalogLivePreviewProps) {
  const displayTitle = storeName.trim() || 'Sua Vitrine';
  const theme = getTheme(themeColor);
  const initials = getStoreInitials(displayTitle);
  const activeDates = filterActiveDeliverySlots(deliveryDates);

  return (
    <div className="mx-auto w-full max-w-[350px] overflow-hidden rounded-[2.25rem] border-[7px] border-[#18181B] bg-stone-50 shadow-xl">
      {/* Barra superior discreta */}
      <div className="flex items-center justify-center gap-1.5 bg-[#18181B] pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Prévia ao vivo
      </div>

      {/* Conteúdo rolável */}
      <div className="h-[560px] overflow-y-auto bg-stone-50 pb-14">
        {/* Header da vitrine */}
        <div
          className={`bg-gradient-to-br ${theme.headerGradient} px-4 py-5 text-white`}
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
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/85 shadow-md ${theme.avatarFallbackBg} ${theme.avatarFallbackText}`}
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
                <p className="mt-0.5 text-[11px] text-white/90">
                  {paymentNotice}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3">
          {/* Datas / Turnos ativos (sem vencidas) */}
          {activeDates.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
                <Calendar className={`h-3.5 w-3.5 ${theme.primaryText}`} />
                Datas e turnos disponíveis
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {activeDates.map((date) => (
                  <span
                    key={date}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${theme.softBg} ${theme.softText}`}
                  >
                    {date}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Modalidades: Entrega / Retirada */}
          {(pickupAddress.trim() || deliveryEstimate.trim()) && (
            <div className="space-y-1.5 rounded-xl border border-stone-200 bg-white p-2.5 text-[11px] text-stone-600">
              {pickupAddress.trim() && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                  <span>
                    <strong className="text-stone-800">Retirada:</strong>{' '}
                    {pickupAddress.trim()}
                  </span>
                </div>
              )}
              {deliveryEstimate.trim() && (
                <div className="flex items-start gap-1.5">
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                  <span>
                    <strong className="text-stone-800">Entrega:</strong>{' '}
                    {deliveryEstimate.trim()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Avisos */}
          {notes.trim() && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="whitespace-pre-line leading-relaxed">{notes}</p>
            </div>
          )}

          {/* Produtos */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Produtos para Encomenda
            </p>

            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-center text-xs text-stone-400">
                Adicione produtos para visualizar na prévia
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
                        <p className="truncate text-xs font-bold text-stone-900">
                          {product.name.trim() || 'Nome do produto'}
                        </p>
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

          <div className="flex items-center justify-center gap-1 pt-2 text-[10px] text-stone-400">
            <img src={logoIcon} alt="" className="h-3.5 w-3.5 object-contain" />
            <span>
              Vitrine criada com <strong>VitriMini</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé mockup */}
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
});
