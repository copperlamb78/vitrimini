import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Store,
} from 'lucide-react';
import type { CreateCatalogResponse } from '../types/catalog';
import {
  getCatalogStatus,
  getSafeErrorMessage,
  mockPayCatalog,
} from '../services/api';
import logoVitriMini from '../assets/logo-vitrimini.png';

interface PixPaymentModalProps {
  paymentData: CreateCatalogResponse;
  isRenewal?: boolean;
  planName?: string;
  planPriceLabel?: string;
  planDays?: number;
  onCancelDraft: (catalogId: string) => void;
  onCloseAfterPaid: () => void;
  onConfirmed: (info: {
    catalogId: string;
    slug: string;
    editToken: string;
  }) => void;
}

export function PixPaymentModal({
  paymentData,
  isRenewal = false,
  planName = 'VitriMini',
  planPriceLabel = 'R$ 9,90',
  planDays = 30,
  onCancelDraft,
  onCloseAfterPaid,
  onConfirmed,
}: PixPaymentModalProps) {
  const [paid, setPaid] = useState(false);
  const [slug, setSlug] = useState(paymentData.slug);
  const [editToken, setEditToken] = useState(paymentData.editToken);

  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedStore, setCopiedStore] = useState(false);
  const [copiedEdit, setCopiedEdit] = useState(false);

  const [checkingManual, setCheckingManual] = useState(false);
  const [manualFeedback, setManualFeedback] = useState<string | null>(null);
  const [confirmingExit, setConfirmingExit] = useState(false);

  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function blockEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener('keydown', blockEscape, true);
    return () => window.removeEventListener('keydown', blockEscape, true);
  }, []);

  const checkStatusOnce = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setCheckingManual(true);
        setManualFeedback(null);
        setError(null);
      }

      try {
        const res = await getCatalogStatus(
          paymentData.catalogId,
          paymentData.paymentRecordId
        );

        const isConfirmed = paymentData.paymentRecordId
          ? Boolean(res.paymentPaid)
          : res.status === 'ACTIVE';

        if (isConfirmed) {
          setSlug(res.slug);
          setEditToken(res.editToken);
          setPaid(true);
          onConfirmed({
            catalogId: paymentData.catalogId,
            slug: res.slug,
            editToken: res.editToken,
          });
          return true;
        }

        if (isManual) {
          setManualFeedback(
            'Pagamento ainda não compensado pelo banco. Assim que aprovar, liberaremos automaticamente.'
          );
        }
      } catch (err) {
        if (isManual) {
          setError(
            getSafeErrorMessage(
              err,
              'Não foi possível verificar agora. Aguarde alguns segundos e tente novamente.'
            )
          );
        }
      } finally {
        if (isManual) {
          setCheckingManual(false);
        }
      }
      return false;
    },
    [paymentData.catalogId, paymentData.paymentRecordId, onConfirmed]
  );

  useEffect(() => {
    if (paid) return;

    void checkStatusOnce(false);

    const interval = setInterval(() => {
      void checkStatusOnce(false);
    }, 3000);

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void checkStatusOnce(false);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [paid, checkStatusOnce]);

  async function handleCopy(text: string, setter: (v: boolean) => void) {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  async function handleMockPay() {
    setSimulating(true);
    setError(null);
    try {
      const res = await mockPayCatalog(paymentData.catalogId);
      if (res.status === 'ACTIVE' || res.paymentPaid) {
        setSlug(res.slug);
        setEditToken(res.editToken);
        setPaid(true);
        onConfirmed({
          catalogId: paymentData.catalogId,
          slug: res.slug,
          editToken: res.editToken,
        });
      }
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível confirmar o pagamento agora. Tente novamente em instantes.'
        )
      );
    } finally {
      setSimulating(false);
    }
  }

  const origin = window.location.origin;
  const storeUrl = `${origin}/c/${slug}`;
  const editUrl = `${origin}/editar/${editToken}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-xs"
    >
      <div className="relative my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {!paid ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setConfirmingExit(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aguardando Pix
              </span>
            </div>

            {confirmingExit && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs font-semibold leading-relaxed text-amber-950">
                    Se você já pagou ou vai pagar este QR Code, não feche. Deseja realmente cancelar?
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingExit(false)}
                    className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800"
                  >
                    Continuar aguardando
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancelDraft(paymentData.catalogId)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Sim, cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="text-center">
              <img
                src={logoVitriMini}
                alt="Logo da VitriMini"
                className="mx-auto mb-2 h-7 w-auto object-contain"
              />
              <h2 className="text-xl font-bold text-stone-900">
                {isRenewal
                  ? `${planName} (+${planDays >= 365 ? '1 ano' : '1 mês'} — ${planPriceLabel})`
                  : `Pague ${planPriceLabel} (${planDays >= 365 ? '1 ano' : '1 mês'})`}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {isRenewal
                  ? `Ao pagar o Pix, sua vitrine ganha mais ${planDays >= 365 ? '1 ano' : '1 mês'} de validade automaticamente (mantendo o dia do vencimento).`
                  : `Sua vitrine ficará ativa por ${planDays >= 365 ? '1 ano' : '1 mês'} com produtos ilimitados e salva na sua conta.`}
              </p>

              {paymentData.qrCodeBase64 && (
                <div className="mt-4 flex justify-center">
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-xs">
                    <img
                      src={paymentData.qrCodeBase64}
                      alt={`QR Code Pix para ativação do ${planName} na VitriMini`}
                      className="h-44 w-44 object-contain"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  handleCopy(paymentData.pixCopyPaste || '', setCopiedPix)
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                {copiedPix ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Código Pix copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar código Pix
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => checkStatusOnce(true)}
                disabled={checkingManual}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${checkingManual ? 'animate-spin' : ''}`}
                />
                {checkingManual
                  ? 'Verificando pagamento...'
                  : 'Já paguei, verificar'}
              </button>

              {manualFeedback && (
                <p className="mt-2.5 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
                  {manualFeedback}
                </p>
              )}

              {paymentData.mockMode && (
                <div className="mt-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/70 p-3">
                  <p className="text-xs font-medium text-emerald-800">
                    Ambiente de Teste (MOCK_PIX=true)
                  </p>
                  <button
                    type="button"
                    onClick={handleMockPay}
                    disabled={simulating}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {simulating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Simular Pagamento Aprovado
                  </button>
                </div>
              )}

              {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-3 text-xl font-bold text-stone-900">
              {isRenewal
                ? `Vitrine Renovada por +${planDays} dias!`
                : 'Vitrine Publicada no VitriMini!'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Sua vitrine está ativa e disponível a qualquer momento no seu painel{' '}
              <strong>Minhas Vitrines</strong>.
            </p>

            <div className="mt-5 space-y-3 text-left">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Link da Vitrine (envie aos clientes)
                </p>
                <p className="mt-1 truncate text-sm font-medium text-stone-800">
                  {storeUrl}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(storeUrl, setCopiedStore)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    {copiedStore ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedStore ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <a
                    href={`/c/${slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-900">
                  Painel de Edição da Vitrine
                </p>
                <p className="mt-0.5 text-xs text-amber-800">
                  Você também pode acessar este painel quando quiser entrando na sua conta em <strong>Minhas Vitrines</strong>.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(editUrl, setCopiedEdit)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    {copiedEdit ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedEdit ? 'Copiado!' : 'Copiar link de edição'}
                  </button>
                  <a
                    href={`/editar/${editToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/minhas-vitrines"
                onClick={onCloseAfterPaid}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white transition hover:bg-stone-800"
              >
                <Store className="h-3.5 w-3.5" />
                Minhas Vitrines
              </Link>
              <button
                type="button"
                onClick={onCloseAfterPaid}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-50"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
