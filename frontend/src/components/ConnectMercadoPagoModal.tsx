import { useState } from 'react';
import { CreditCard, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import {
  getMercadoPagoConnectUrl,
  getSafeErrorMessage,
} from '../services/api';

export function getMpInviteDismissedKey(catalogId: string): string {
  return `vitrimini_mp_invite_dismissed_${catalogId}`;
}

export function isMpInviteDismissed(catalogId: string): boolean {
  try {
    return sessionStorage.getItem(getMpInviteDismissedKey(catalogId)) === '1';
  } catch {
    return false;
  }
}

export function dismissMpInvite(catalogId: string): void {
  try {
    sessionStorage.setItem(getMpInviteDismissedKey(catalogId), '1');
  } catch {
    // Ignora falhas de storage
  }
}

interface ConnectMercadoPagoModalProps {
  catalogId: string;
  badgeText?: string;
  onClose: () => void;
}

export function ConnectMercadoPagoModal({
  catalogId,
  badgeText = 'Plano Pro liberado',
  onClose,
}: ConnectMercadoPagoModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { authUrl } = await getMercadoPagoConnectUrl(catalogId);
      window.location.assign(authUrl);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível iniciar a conexão com o Mercado Pago agora.'
        )
      );
      setConnecting(false);
    }
  }

  function handleDismiss() {
    dismissMpInvite(catalogId);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-mp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
            <Sparkles className="h-3.5 w-3.5" />
            {badgeText}
          </span>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar janela"
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2
          id="connect-mp-modal-title"
          className="mt-3 text-xl font-extrabold leading-snug text-zinc-900"
        >
          Quer receber por Pix e Cartão direto na sua vitrine?
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Seu acesso ao Plano Pro já está liberado! Conecte sua conta do Mercado
          Pago para que seus clientes paguem na hora e o pedido seja aprovado
          sozinho — com o dinheiro caindo direto para você.
        </p>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            <strong>Importante:</strong> a VitriMini cobra 0% de comissão.
            Sobre as vendas pagas online, aplicam-se apenas as taxas padrão da
            sua própria conta do Mercado Pago (Pix ou Cartão).
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={connecting}
            onClick={() => void handleConnect()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Abrindo Mercado Pago...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Conectar minha conta Mercado Pago
              </>
            )}
          </button>

          <button
            type="button"
            disabled={connecting}
            onClick={handleDismiss}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            Agora não, usar só WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
