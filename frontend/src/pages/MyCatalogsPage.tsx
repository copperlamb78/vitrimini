import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  PenLine,
  RefreshCw,
  Loader2,
  LogOut,
  Store,
  Calendar,
  Sparkles,
  ShoppingBag,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyCatalogs,
  getSafeErrorMessage,
  renewCatalog,
} from '../services/api';
import type {
  CreateCatalogResponse,
  MyCatalogItem,
} from '../types/catalog';
import { getStoreInitials, getTheme } from '../constants/themes';
import { resolveImageUrl } from '../utils/format';
import { applyPageSeo } from '../utils/seo';
import { PixPaymentModal } from '../components/PixPaymentModal';
import { PlanSelectorModal, type PlanOption } from '../components/PlanSelectorModal';
import {
  ConnectMercadoPagoModal,
  isMpInviteDismissed,
} from '../components/ConnectMercadoPagoModal';
import { MyCatalogsSkeleton } from '../components/Skeletons';
import logoVitriMini from '../assets/logo-vitrimini.png';

const ShareCatalogModal = lazy(() =>
  import('../components/ShareCatalogModal').then((m) => ({
    default: m.ShareCatalogModal,
  }))
);

function formatExpirationDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
}

export function MyCatalogsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [catalogs, setCatalogs] = useState<MyCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [paymentModalData, setPaymentModalData] =
    useState<CreateCatalogResponse | null>(null);
  const [selectedPlanForModal, setSelectedPlanForModal] =
    useState<PlanOption | null>(null);
  const [planTargetCatalog, setPlanTargetCatalog] =
    useState<MyCatalogItem | null>(null);
  const [mpInviteCatalogId, setMpInviteCatalogId] = useState<string | null>(
    null
  );
  const [isModalRenewal, setIsModalRenewal] = useState(true);
  const [shareCatalog, setShareCatalog] = useState<{
    storeName: string;
    slug: string;
    themeColor: string;
  } | null>(null);

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyCatalogs();
      setCatalogs(res.catalogs);
    } catch (err) {
      setError(
        getSafeErrorMessage(err, 'Não foi possível carregar suas vitrines.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyPageSeo({
      title: 'Minhas Vitrines — VitriMini',
      description: 'Painel de gerenciamento das suas vitrines na VitriMini.',
      canonicalPath: '/minhas-vitrines',
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/entrar', { replace: true });
      return;
    }
    void fetchCatalogs();
  }, [authLoading, user, navigate, fetchCatalogs]);

  async function handleCopyStoreUrl(slug: string, id: string) {
    const url = `${window.location.origin}/c/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleConfirmPlanSelection(plan: PlanOption) {
    if (!planTargetCatalog) return;
    setRenewingId(planTargetCatalog.id);
    setError(null);
    try {
      const res = await renewCatalog(planTargetCatalog.id, plan.code);
      setIsModalRenewal(planTargetCatalog.status !== 'DRAFT');
      setSelectedPlanForModal(plan);
      setPlanTargetCatalog(null);
      setPaymentModalData(res);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível gerar o QR Code Pix agora. Tente novamente.'
        )
      );
    } finally {
      setRenewingId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  if (authLoading || (loading && catalogs.length === 0)) {
    return <MyCatalogsSkeleton />;
  }

  const firstName = user?.name.split(' ')[0] || 'Lojista';

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Navbar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoVitriMini}
              alt="VitriMini"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="hidden text-xs font-semibold text-zinc-600 sm:inline">
              Olá, <strong className="text-zinc-900">{firstName}</strong>
            </span>

            <Link
              to="/meus-pedidos"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Meus Pedidos</span>
            </Link>

            <Link
              to="/criar"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova vitrine
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-5xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
              Minhas Vitrines ({catalogs.length})
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              Copie o link para divulgar, edite produtos ou renove o prazo de validade.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {catalogs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Store className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-extrabold text-zinc-900">
              Você ainda não criou nenhuma vitrine
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">
              Monte sua primeira vitrine de encomendas com fotos, datas de entrega e sinal automático via Pix em 2 minutos.
            </p>
            <Link
              to="/criar"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
              Criar primeira vitrine
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {catalogs.map((cat) => {
              const theme = getTheme(cat.themeColor);
              const logoSrc = resolveImageUrl(cat.logoUrl);
              const initials = getStoreInitials(cat.storeName);
              const formattedDate = formatExpirationDate(cat.expiresAt);
              const isCopied = copiedId === cat.id;
              const isRenewing = renewingId === cat.id;
              const publicHref =
                cat.status === 'ACTIVE'
                  ? `/c/${cat.slug}`
                  : `/c/${cat.slug}?preview=true`;

              return (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition hover:border-zinc-300"
                >
                  <div>
                    {/* Topo do Card: Avatar + Nome + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt={cat.storeName}
                            className="h-12 w-12 shrink-0 rounded-full border border-zinc-200 object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${theme.avatarFallbackBg} ${theme.avatarFallbackText}`}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-extrabold text-zinc-900">
                            {cat.storeName}
                          </h2>
                          <p className="truncate text-xs text-zinc-500">
                            /c/{cat.slug} • {cat._count.products}{' '}
                            {cat._count.products === 1 ? 'produto' : 'produtos'}
                          </p>
                        </div>
                      </div>

                      {cat.status === 'ACTIVE' && cat.isTrial && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800">
                          {cat.daysLeft != null
                            ? `15 dias grátis • ${cat.daysLeft === 1 ? 'Resta 1 dia' : `Restam ${cat.daysLeft} dias`}`
                            : '15 dias grátis'}
                        </span>
                      )}
                      {cat.status === 'ACTIVE' && !cat.isTrial && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800">
                          {cat.planType === 'PRO' ? 'Ativa • Pro' : 'Ativa'}
                        </span>
                      )}
                      {cat.status === 'DRAFT' && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">
                          Aguardando Pix
                        </span>
                      )}
                      {cat.status === 'EXPIRED' && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase text-red-700">
                          Expirada
                        </span>
                      )}
                    </div>

                    {/* Metadados: Validade + Renovações */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                      {formattedDate ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                          {cat.status === 'EXPIRED'
                            ? `Expirou em ${formattedDate}`
                            : `Válida até ${formattedDate}`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          Pague o Pix para ativar por 90 dias
                        </span>
                      )}

                      {cat.renewalCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
                          <RefreshCw className="h-3 w-3" />
                          Renovada {cat.renewalCount}x
                        </span>
                      )}
                    </div>

                    {(cat.status === 'EXPIRED' || cat.isExpired) &&
                      cat.daysLeftToDelete != null && (
                        <p className="mt-2.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-[11px] font-medium text-red-700">
                          Expirada • Será apagada permanentemente em{' '}
                          <strong>
                            {cat.daysLeftToDelete}{' '}
                            {cat.daysLeftToDelete === 1 ? 'dia' : 'dias'}
                          </strong>{' '}
                          se não for renovada
                        </p>
                      )}
                  </div>

                  {/* Botões de Ação Direta */}
                  <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {/* Copiar Link da Vitrine + Abrir */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyStoreUrl(cat.slug, cat.id)}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 shrink-0" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 shrink-0" />
                              Copiar Link
                            </>
                          )}
                        </button>
                        <a
                          href={publicHref}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir Vitrine em nova aba"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      {/* Painel de Gestão (Pedidos, Financeiro e Catálogo) */}
                      <Link
                        to={`/painel/${cat.id}`}
                        className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-800 transition hover:bg-zinc-50"
                      >
                        <PenLine className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                        Gerenciar
                      </Link>
                    </div>

                    {/* Botão discreto de Divulgação / QR Code para vitrines ativas */}
                    {cat.status === 'ACTIVE' && !cat.isExpired && (
                      <button
                        type="button"
                        onClick={() =>
                          setShareCatalog({
                            storeName: cat.storeName,
                            slug: cat.slug,
                            themeColor: cat.themeColor,
                          })
                        }
                        className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <QrCode className="h-3.5 w-3.5 text-zinc-500" />
                        Divulgar / QR Code
                      </button>
                    )}

                    {/* Botão de Renovação / Ativação / Planos */}
                    <button
                      type="button"
                      onClick={() => setPlanTargetCatalog(cat)}
                      disabled={isRenewing}
                      className={`flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        cat.status === 'DRAFT'
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {isRenewing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {cat.status === 'DRAFT'
                        ? 'Escolher plano e ativar'
                        : cat.isTrial && !cat.isExpired
                        ? 'Escolher plano (a partir de R$ 24,90)'
                        : 'Renovar / Mudar plano'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {planTargetCatalog && (
        <PlanSelectorModal
          storeName={planTargetCatalog.storeName}
          initialPlan={
            planTargetCatalog.planType === 'PRO' ? 'PRO_90D' : 'ESSENTIAL_90D'
          }
          currentPlanType={planTargetCatalog.planType}
          hasActiveDays={Boolean(
            !planTargetCatalog.isExpired && planTargetCatalog.expiresAt
          )}
          loading={renewingId === planTargetCatalog.id}
          onSelectPlan={(plan) => void handleConfirmPlanSelection(plan)}
          onClose={() => setPlanTargetCatalog(null)}
        />
      )}

      {paymentModalData && (
        <PixPaymentModal
          paymentData={paymentModalData}
          isRenewal={isModalRenewal}
          planName={selectedPlanForModal?.name}
          planPriceLabel={selectedPlanForModal?.priceLabel}
          planDays={selectedPlanForModal?.days}
          onCancelDraft={() => setPaymentModalData(null)}
          onCloseAfterPaid={() => {
            setPaymentModalData(null);
            void fetchCatalogs();
          }}
          onConfirmed={(info) => {
            void fetchCatalogs();
            if (
              selectedPlanForModal?.code !== 'ESSENTIAL_90D' &&
              !isMpInviteDismissed(info.catalogId)
            ) {
              setPaymentModalData(null);
              setMpInviteCatalogId(info.catalogId);
            }
          }}
        />
      )}

      {mpInviteCatalogId && (
        <ConnectMercadoPagoModal
          catalogId={mpInviteCatalogId}
          badgeText="Plano Pro ativado!"
          onClose={() => setMpInviteCatalogId(null)}
        />
      )}

      {shareCatalog && (
        <Suspense fallback={null}>
          <ShareCatalogModal
            storeName={shareCatalog.storeName}
            slug={shareCatalog.slug}
            themeColor={shareCatalog.themeColor}
            onClose={() => setShareCatalog(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
