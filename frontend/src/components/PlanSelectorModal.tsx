import { useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import type { CatalogPlanCode, CatalogPlanType } from '../types/catalog';

export interface PlanOption {
  code: CatalogPlanCode;
  name: string;
  priceLabel: string;
  periodLabel: string;
  days: number;
  badge?: string;
  features: string[];
}

export const VITRIMINI_PLANS: PlanOption[] = [
  {
    code: 'ESSENTIAL_90D',
    name: 'Essencial',
    priceLabel: 'R$ 24,90',
    periodLabel: '90 dias',
    days: 90,
    features: [
      'Vitrine completa com produtos ilimitados',
      'Pedidos organizados no WhatsApp',
      '0% de comissão sobre as vendas',
    ],
  },
  {
    code: 'PRO_90D',
    name: 'Pro Trimestral',
    priceLabel: 'R$ 39,90',
    periodLabel: '90 dias',
    days: 90,
    badge: 'Mais popular',
    features: [
      'Tudo do Essencial + pagamento online automático',
      'Receba no Pix e Cartão direto na sua conta Mercado Pago',
      'Baixa automática dos pedidos pagos',
    ],
  },
  {
    code: 'PRO_365D',
    name: 'Pro Anual',
    priceLabel: 'R$ 99,90',
    periodLabel: '365 dias',
    days: 365,
    badge: 'Economize R$ 59,70',
    features: [
      'Todos os recursos do Plano Pro por 1 ano inteiro',
      'Pagamento online automático (Pix e Cartão)',
      '0% de comissão sobre as vendas',
    ],
  },
];

interface PlanSelectorModalProps {
  storeName: string;
  initialPlan?: CatalogPlanCode;
  currentPlanType?: CatalogPlanType;
  hasActiveDays?: boolean;
  loading?: boolean;
  onSelectPlan: (plan: PlanOption) => void;
  onClose: () => void;
}

export function PlanSelectorModal({
  storeName,
  initialPlan = 'PRO_90D',
  currentPlanType,
  hasActiveDays = false,
  loading = false,
  onSelectPlan,
  onClose,
}: PlanSelectorModalProps) {
  const [selected, setSelected] = useState<CatalogPlanCode>(initialPlan);
  const chosenPlan =
    VITRIMINI_PLANS.find((p) => p.code === selected) || VITRIMINI_PLANS[1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600">
              <Sparkles className="h-3.5 w-3.5" />
              Escolha seu plano
            </span>
            <h2 className="mt-0.5 text-lg font-extrabold text-zinc-900">
              Ativar ou renovar "{storeName}"
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {currentPlanType === 'ESSENTIAL' && hasActiveDays && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-900">
              Seus dias restantes do plano Essencial serão somados automaticamente ao novo prazo do Plano Pro.
            </div>
          )}
          {VITRIMINI_PLANS.map((plan) => {
            const isSelected = selected === plan.code;
            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => setSelected(plan.code)}
                className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-zinc-900">
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-zinc-900">
                      {plan.priceLabel}
                    </span>
                    <span className="ml-1 text-xs font-medium text-zinc-500">
                      / {plan.periodLabel}
                    </span>
                  </div>
                </div>

                <ul className="mt-2 space-y-1">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-1.5 text-xs text-zinc-600"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => onSelectPlan(chosenPlan)}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando Pix...
            </>
          ) : (
            `Gerar Pix — ${chosenPlan.priceLabel} (${chosenPlan.periodLabel})`
          )}
        </button>
      </div>
    </div>
  );
}
