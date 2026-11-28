import { useRef, useState } from 'react';
import {
  Check,
  CreditCard,
  Loader2,
  Sparkles,
  Unlink,
} from 'lucide-react';
import {
  disconnectMercadoPago,
  getSafeErrorMessage,
  toggleMercadoPagoOnlinePayment,
  updateMercadoPagoPaymentMethods,
} from '../services/api';
import { ToggleSwitch } from './ToggleSwitch';

export interface MpCatalogMeta {
  id: string;
  hasProAccess?: boolean;
  mpConnected?: boolean;
  onlinePaymentEnabled?: boolean;
  mpAcceptPix?: boolean;
  mpAcceptCard?: boolean;
}

interface MercadoPagoIntegrationCardProps {
  catalogMeta: MpCatalogMeta;
  mpLoading: boolean;
  onConnect: () => void;
  onRequestUpgrade: () => void;
  onMetaChange: (updater: (prev: MpCatalogMeta) => MpCatalogMeta) => void;
}

export function MercadoPagoIntegrationCard({
  catalogMeta,
  mpLoading,
  onConnect,
  onRequestUpgrade,
  onMetaChange,
}: MercadoPagoIntegrationCardProps) {
  const [busyField, setBusyField] = useState<
    'disconnect' | 'online' | 'pix' | 'card' | null
  >(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const lockRef = useRef(false);

  const acceptPix = catalogMeta.mpAcceptPix !== false;
  const acceptCard = catalogMeta.mpAcceptCard !== false;

  function showSuccess(text: string) {
    setFeedback({ type: 'success', text });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 2500);
  }

  async function handleToggleOnline() {
    if (lockRef.current) return;
    lockRef.current = true;
    const nextVal = !Boolean(catalogMeta.onlinePaymentEnabled);
    setBusyField('online');
    setFeedback(null);
    try {
      const res = await toggleMercadoPagoOnlinePayment(catalogMeta.id, nextVal);
      onMetaChange((prev) => ({
        ...prev,
        onlinePaymentEnabled: res.onlinePaymentEnabled,
      }));
      showSuccess('✓ Salvo!');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: getSafeErrorMessage(
          err,
          'Não foi possível alterar o pagamento online.'
        ),
      });
    } finally {
      lockRef.current = false;
      setBusyField(null);
    }
  }

  async function handleToggleMethod(method: 'pix' | 'card') {
    if (lockRef.current) return;
    const nextPix = method === 'pix' ? !acceptPix : acceptPix;
    const nextCard = method === 'card' ? !acceptCard : acceptCard;

    if (!nextPix && !nextCard) {
      setFeedback({
        type: 'error',
        text: 'Mantenha pelo menos Pix ou Cartão ativo enquanto o Mercado Pago estiver conectado.',
      });
      return;
    }

    lockRef.current = true;
    setBusyField(method);
    setFeedback(null);

    // Atualização otimista com rollback em caso de erro
    const prevPix = acceptPix;
    const prevCard = acceptCard;
    onMetaChange((prev) => ({
      ...prev,
      mpAcceptPix: nextPix,
      mpAcceptCard: nextCard,
    }));

    try {
      const updated = await updateMercadoPagoPaymentMethods(catalogMeta.id, {
        mpAcceptPix: nextPix,
        mpAcceptCard: nextCard,
      });
      onMetaChange((prev) => ({
        ...prev,
        mpAcceptPix: updated.mpAcceptPix,
        mpAcceptCard: updated.mpAcceptCard,
      }));
      showSuccess('✓ Salvo!');
    } catch (err) {
      onMetaChange((prev) => ({
        ...prev,
        mpAcceptPix: prevPix,
        mpAcceptCard: prevCard,
      }));
      setFeedback({
        type: 'error',
        text: getSafeErrorMessage(
          err,
          'Não foi possível salvar a preferência de pagamento.'
        ),
      });
    } finally {
      lockRef.current = false;
      setBusyField(null);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-rose-600" />
          <h3 className="text-sm font-extrabold text-zinc-900">
            Recebimento Online (Mercado Pago)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {feedback?.type === 'success' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              <Check className="h-3 w-3" />
              {feedback.text.replace(/^✓\s*/, '')}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
            <Sparkles className="h-3 w-3" />
            Plano Pro
          </span>
        </div>
      </div>

      {!catalogMeta.hasProAccess ? (
        <div className="mt-3 space-y-2.5">
          <p className="text-xs leading-relaxed text-zinc-600">
            Receba pagamentos automáticos no Pix e Cartão direto na sua conta
            Mercado Pago, com baixa automática dos pedidos pagos. Disponível no{' '}
            <strong>Plano Pro</strong> (R$ 14,90/mês ou R$ 149,00/ano).
          </p>
          <button
            type="button"
            onClick={onRequestUpgrade}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Fazer upgrade para o Plano Pro
          </button>
        </div>
      ) : !catalogMeta.mpConnected ? (
        <div className="mt-3 space-y-2.5">
          <p className="text-xs leading-relaxed text-zinc-600">
            Conecte sua conta Mercado Pago para que seus clientes paguem na hora
            por Pix ou Cartão, com o dinheiro caindo direto para você.
          </p>
          <p className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
            <strong>Importante:</strong> a VitriMini cobra 0% de comissão. Sobre
            as vendas pagas online, aplicam-se apenas as taxas padrão da sua
            própria conta do Mercado Pago (Pix ou Cartão).
          </p>
          <button
            type="button"
            disabled={mpLoading}
            aria-busy={mpLoading}
            onClick={onConnect}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-sky-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mpLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            {mpLoading ? 'Conectando...' : 'Conectar minha conta Mercado Pago'}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs">
            <span className="font-bold text-emerald-800">
              Conta Mercado Pago conectada
            </span>
            <button
              type="button"
              disabled={busyField === 'disconnect' || mpLoading}
              onClick={async () => {
                if (lockRef.current) return;
                lockRef.current = true;
                setBusyField('disconnect');
                setFeedback(null);
                try {
                  await disconnectMercadoPago(catalogMeta.id);
                  onMetaChange((prev) => ({
                    ...prev,
                    mpConnected: false,
                    onlinePaymentEnabled: false,
                  }));
                } catch (err) {
                  setFeedback({
                    type: 'error',
                    text: getSafeErrorMessage(err, 'Erro ao desconectar conta.'),
                  });
                } finally {
                  lockRef.current = false;
                  setBusyField(null);
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-60"
            >
              {busyField === 'disconnect' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unlink className="h-3 w-3" />
              )}
              {busyField === 'disconnect' ? 'Desconectando...' : 'Desconectar'}
            </button>
          </div>

          <ToggleSwitch
            checked={Boolean(catalogMeta.onlinePaymentEnabled)}
            loading={busyField === 'online'}
            label="Ativar pagamento online na vitrine"
            description="Quando ligado, clientes podem pagar direto na vitrine com baixa automática."
            onToggle={() => void handleToggleOnline()}
          />

          {Boolean(catalogMeta.onlinePaymentEnabled) && (
            <div className="space-y-2 pl-1">
              <ToggleSwitch
                checked={acceptPix}
                loading={busyField === 'pix'}
                label="Pix automático"
                description="Aprovação na hora, taxa menor no Mercado Pago e sem risco de estorno."
                onToggle={() => void handleToggleMethod('pix')}
              />
              <ToggleSwitch
                checked={acceptCard}
                loading={busyField === 'card'}
                label="Cartão de Crédito"
                description="Permite pagar com cartão direto na vitrine (sujeito às taxas de cartão do Mercado Pago)."
                onToggle={() => void handleToggleMethod('card')}
              />
            </div>
          )}

          {feedback?.type === 'error' && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {feedback.text}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
