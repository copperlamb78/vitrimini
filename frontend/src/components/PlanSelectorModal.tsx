import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, CreditCard, Loader2, QrCode, ShieldCheck, Sparkles, X } from 'lucide-react';
import type {
  CatalogBillingType,
  CatalogPlanCode,
  CatalogPlanType,
  SubscriptionStatus,
} from '../types/catalog';

export type PlanPaymentMethod = 'PIX' | 'CARD';

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
    code: 'ESSENTIAL_30',
    name: 'Essencial Mensal',
    priceLabel: 'R$ 9,90',
    periodLabel: 'mês',
    days: 30,
    features: [
      'Vitrine completa com produtos ilimitados',
      'Pedidos organizados no WhatsApp',
      'VitriLink e 0% de comissão sobre vendas',
    ],
  },
  {
    code: 'PRO_30',
    name: 'Pro Mensal',
    priceLabel: 'R$ 14,90',
    periodLabel: 'mês',
    days: 30,
    badge: 'Mais popular',
    features: [
      'Tudo do Essencial + pagamento online automático',
      'Receba no Pix e Cartão direto na sua conta Mercado Pago',
      'Baixa automática dos pedidos pagos',
    ],
  },
  {
    code: 'PRO_365',
    name: 'Pro Anual',
    priceLabel: 'R$ 149,00',
    periodLabel: 'ano',
    days: 365,
    badge: '2 meses grátis',
    features: [
      'Todos os recursos do Plano Pro por 1 ano inteiro + 0% de comissão',
      'Equivalente a R$ 12,41/mês — economia de R$ 29,80',
      'Pagamento online automático (Pix e Cartão) e baixa automática',
    ],
  },
];

interface PlanSelectorModalProps {
  storeName: string;
  initialPlan?: CatalogPlanCode;
  currentPlanType?: CatalogPlanType;
  hasActiveDays?: boolean;
  billingType?: CatalogBillingType | null;
  autoRenew?: boolean;
  subscriptionStatus?: SubscriptionStatus | null;
  expiresAt?: string | null;
  loading?: boolean;
  error?: string | null;
  accentColor?: string;
  accentTextColor?: string;
  onSelectPlan: (plan: PlanOption, paymentMethod?: PlanPaymentMethod) => void;
  onSelectCardSubscription?: (plan: PlanOption) => void;
  onClose: () => void;
}

function formatExpiryShort(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR');
}

export function PlanSelectorModal({
  storeName,
  initialPlan = 'PRO_30',
  currentPlanType,
  hasActiveDays = false,
  billingType,
  autoRenew = false,
  expiresAt,
  loading = false,
  error = null,
  accentColor = '#E11D48',
  accentTextColor = '#FFFFFF',
  onSelectPlan,
  onSelectCardSubscription,
  onClose,
}: PlanSelectorModalProps) {
  const [selected, setSelected] = useState<CatalogPlanCode>(initialPlan);
  const [paymentMethod, setPaymentMethod] = useState<PlanPaymentMethod>('PIX');
  const [autoRenewConsent, setAutoRenewConsent] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  const chosenPlan =
    VITRIMINI_PLANS.find((p) => p.code === selected) || VITRIMINI_PLANS[1];
  const cycleDescription =
    chosenPlan.days === 365 ? 'anualmente' : 'mensalmente';
  const isCardBlocked = paymentMethod === 'CARD' && !autoRenewConsent;
  const formattedExpiry = formatExpiryShort(expiresAt);
  const isCardActive = billingType === 'CARD_RECURRING' && Boolean(autoRenew);
  const isCardCancelledWithDays =
    billingType === 'CARD_RECURRING' &&
    !autoRenew &&
    hasActiveDays &&
    Boolean(formattedExpiry);
  const selectedPlanTier: CatalogPlanType = chosenPlan.code.startsWith('PRO')
    ? 'PRO'
    : 'ESSENTIAL';
  const isDuplicateActiveCardPlan =
    isCardActive && currentPlanType === selectedPlanTier;

  function handleConfirm() {
    if (loading) return;
    if (paymentMethod === 'CARD') {
      if (!autoRenewConsent) return;
      if (onSelectCardSubscription) {
        onSelectCardSubscription(chosenPlan);
        return;
      }
      onSelectPlan(chosenPlan, 'CARD');
      return;
    }
    onSelectPlan(chosenPlan, 'PIX');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: accentColor }}
            >
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
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {isCardActive && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs font-medium text-emerald-900">
              Você já possui uma assinatura ativa no cartão com renovação automática
              {formattedExpiry ? ` (válida até ${formattedExpiry})` : ''}. Não é necessário contratar o mesmo plano novamente.
            </div>
          )}
          {isCardCancelledWithDays && formattedExpiry && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs font-medium text-amber-900">
              Sua renovação automática foi cancelada, mas você ainda possui dias pagos garantidos até{' '}
              <strong>{formattedExpiry}</strong>. Não é necessário assinar novamente antes dessa data.
            </div>
          )}
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
                onClick={() => {
                  setSelected(plan.code);
                  setAutoRenewConsent(false);
                }}
                style={
                  isSelected
                    ? {
                        borderColor: accentColor,
                        boxShadow: `0 0 0 2px ${accentColor}25`,
                      }
                    : undefined
                }
                className={`min-h-[44px] w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'bg-zinc-50/80'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-zinc-900">
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${accentColor}18`,
                          color: accentColor,
                        }}
                      >
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

        {/* Forma de pagamento */}
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Forma de pagamento
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('PIX');
                setAutoRenewConsent(false);
              }}
              style={
                paymentMethod === 'PIX'
                  ? {
                      borderColor: accentColor,
                      boxShadow: `0 0 0 2px ${accentColor}25`,
                    }
                  : undefined
              }
              className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                paymentMethod === 'PIX'
                  ? 'bg-zinc-50/80'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <QrCode
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{
                  color: paymentMethod === 'PIX' ? accentColor : '#71717A',
                }}
              />
              <div>
                <p className="text-xs font-extrabold text-zinc-900">Pix</p>
                <p className="text-[11px] leading-snug text-zinc-500">
                  Sem renovação automática
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              style={
                paymentMethod === 'CARD'
                  ? {
                      borderColor: accentColor,
                      boxShadow: `0 0 0 2px ${accentColor}25`,
                    }
                  : undefined
              }
              className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                paymentMethod === 'CARD'
                  ? 'bg-zinc-50/80'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <CreditCard
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{
                  color: paymentMethod === 'CARD' ? accentColor : '#71717A',
                }}
              />
              <div>
                <p className="text-xs font-extrabold text-zinc-900">
                  Cartão de Crédito
                </p>
                <p className="text-[11px] leading-snug text-zinc-500">
                  Renovação automática • cancele quando quiser
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Quadro obrigatório Decreto nº 7.962/2013 + aceite expresso */}
        {paymentMethod === 'CARD' && (
          <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-700">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-zinc-900">
                  Resumo da assinatura
                </p>
                <p>
                  <strong>{chosenPlan.priceLabel}</strong> cobrado{' '}
                  <strong>{cycleDescription}</strong> no seu cartão.
                </p>
                <p className="text-[11px] text-zinc-600">
                  Renovação automática; cancele quando quiser direto no painel,
                  sem multa e mantendo o acesso até o fim do período pago.
                </p>
              </div>
            </div>

            <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-2.5">
              <input
                type="checkbox"
                checked={autoRenewConsent}
                onChange={(e) => setAutoRenewConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
              />
              <span className="text-[11px] font-medium leading-snug text-zinc-800">
                Autorizo a cobrança recorrente de{' '}
                <strong>{chosenPlan.priceLabel}</strong> {cycleDescription} no
                meu cartão e sei que posso cancelar no painel.
              </span>
            </label>
          </div>
        )}

        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {isDuplicateActiveCardPlan && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Este plano já está ativo com cartão cadastrado. Para evitar cobrança duplicada, selecione outro plano acima ou gerencie sua assinatura no painel.
            </span>
          </div>
        )}

        <button
          type="button"
          disabled={loading || isCardBlocked || isDuplicateActiveCardPlan}
          aria-busy={loading}
          onClick={handleConfirm}
          style={{
            backgroundColor: accentColor,
            color: accentTextColor,
          }}
          className="mt-5 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold shadow-sm transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {paymentMethod === 'CARD' ? 'Redirecionando...' : 'Gerando Pix...'}
            </>
          ) : paymentMethod === 'CARD' ? (
            'Assinar com Cartão'
          ) : (
            'Continuar no Pix'
          )}
        </button>
      </div>
    </div>
  );
}
