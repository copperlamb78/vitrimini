import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  ExternalLink,
  PenLine,
  CalendarPlus,
  ArrowRightLeft,
  Sparkles,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import {
  changeAdminCatalogPlan,
  deleteAdminCatalog,
  listAdminCatalogs,
  transferAdminCatalog,
  updateAdminCatalogLifecycle,
  updateAdminCatalogSlug,
} from '../../services/adminApi';
import type { AdminCatalogItem, HealthStage } from '../../types/admin';
import type { CatalogPlanCode, CatalogStatus } from '../../types/catalog';

const STAGE_BADGE: Record<HealthStage, { label: string; cls: string }> = {
  DRAFT_STUCK: {
    label: 'Travado no rascunho',
    cls: 'bg-zinc-100 text-zinc-700',
  },
  NO_PRODUCTS: {
    label: 'Sem produtos',
    cls: 'bg-amber-100 text-amber-800',
  },
  READY: {
    label: 'Pronta',
    cls: 'bg-sky-100 text-sky-800',
  },
  SELLING: {
    label: 'Vendendo',
    cls: 'bg-emerald-100 text-emerald-800',
  },
};

function formatDateShort(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function AdminCatalogsTab({
  onToast,
}: {
  onToast: (msg: string, isError?: boolean) => void;
}) {
  const [items, setItems] = useState<AdminCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 350);
  const [status, setStatus] = useState<CatalogStatus | ''>('');
  const [planType, setPlanType] = useState<'ESSENTIAL' | 'PRO' | ''>('');
  const [busyQuickKey, setBusyQuickKey] = useState<string | null>(null);
  const actionLockRef = useRef(false);

  const [modal, setModal] = useState<
    | { type: 'slug'; cat: AdminCatalogItem; value: string }
    | {
        type: 'lifecycle';
        cat: AdminCatalogItem;
        expiresAt: string;
        nextStatus: CatalogStatus;
        reason: string;
      }
    | { type: 'transfer'; cat: AdminCatalogItem; targetEmail: string }
    | {
        type: 'plan';
        cat: AdminCatalogItem;
        planCode: CatalogPlanCode;
        adjustExpiration: boolean;
      }
    | { type: 'delete'; cat: AdminCatalogItem; confirmSlug: string }
    | null
  >(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminCatalogs({
        page,
        pageSize: 15,
        q: debouncedQ.trim() || undefined,
        status,
        planType,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao listar vitrines.', true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, status, planType, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleQuickDays(cat: AdminCatalogItem, days: number) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyQuickKey(`${cat.id}:${days}`);
    setSaving(true);
    try {
      await updateAdminCatalogLifecycle(cat.id, {
        addDays: days,
        reason: `Cortesia +${days}d pelo Admin`,
      });
      onToast(`+${days} dias adicionados em "${cat.storeName}".`);
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao estender prazo.', true);
    } finally {
      actionLockRef.current = false;
      setBusyQuickKey(null);
      setSaving(false);
    }
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || actionLockRef.current) return;
    actionLockRef.current = true;
    setSaving(true);
    try {
      if (modal.type === 'slug') {
        await updateAdminCatalogSlug(modal.cat.id, modal.value);
        onToast('Slug atualizado com sucesso.');
      } else if (modal.type === 'lifecycle') {
        await updateAdminCatalogLifecycle(modal.cat.id, {
          expiresAt: modal.expiresAt || undefined,
          status: modal.nextStatus,
          reason: modal.reason || undefined,
        });
        onToast('Validade e status atualizados.');
      } else if (modal.type === 'transfer') {
        await transferAdminCatalog(modal.cat.id, modal.targetEmail);
        onToast(`Vitrine transferida para ${modal.targetEmail}.`);
      } else if (modal.type === 'plan') {
        await changeAdminCatalogPlan(
          modal.cat.id,
          modal.planCode,
          modal.adjustExpiration
        );
        onToast('Plano alterado com sucesso.');
      } else if (modal.type === 'delete') {
        await deleteAdminCatalog(modal.cat.id, modal.confirmSlug);
        onToast(`Vitrine "${modal.cat.slug}" excluída definitivamente.`);
      }
      setModal(null);
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao salvar alteração.', true);
    } finally {
      actionLockRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar loja, slug, WhatsApp ou e-mail..."
            className="w-full rounded-xl border border-zinc-200 py-2 pr-3 pl-9 text-xs outline-none focus:border-rose-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as CatalogStatus | '');
          }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
        >
          <option value="">Todos status</option>
          <option value="ACTIVE">Ativas</option>
          <option value="DRAFT">Rascunho</option>
          <option value="EXPIRED">Expiradas</option>
        </select>
        <select
          value={planType}
          onChange={(e) => {
            setPage(1);
            setPlanType(e.target.value as 'ESSENTIAL' | 'PRO' | '');
          }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
        >
          <option value="">Todos planos</option>
          <option value="ESSENTIAL">Essencial</option>
          <option value="PRO">Pro</option>
        </select>
        <span className="text-xs font-semibold text-zinc-500">
          {total} vitrine(s)
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-xs text-zinc-500">
          Nenhuma vitrine encontrada com esses filtros.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((cat) => {
            const stage = STAGE_BADGE[cat.health.stage];
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-zinc-900">
                        {cat.storeName}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          cat.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cat.status === 'DRAFT'
                              ? 'bg-zinc-100 text-zinc-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {cat.status}
                      </span>
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        {cat.planType}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.cls}`}>
                        {stage.label}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <a
                        href={`/c/${cat.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"
                      >
                        /c/{cat.slug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span>Dono: {cat.user.email}</span>
                      <span>Validade: {formatDateShort(cat.expiresAt)}</span>
                      <span>Último login: {formatDateShort(cat.user.lastLoginAt)}</span>
                    </div>

                    {/* Termômetro de Ativação */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        {cat.health.hasLogo ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-300" />
                        )}
                        Logo
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {cat.health.hasWhatsapp ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-zinc-300" />
                        )}
                        WhatsApp
                      </span>
                      <span>{cat._count.products} prod.</span>
                      <span>{cat._count.orders} ped.</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[7, 15, 30].map((d) => {
                      const isQuickBusy = busyQuickKey === `${cat.id}:${d}`;
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={saving}
                          aria-busy={isQuickBusy}
                          onClick={() => void handleQuickDays(cat, d)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isQuickBusy && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          +{d}d
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setModal({ type: 'slug', cat, value: cat.slug })
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <PenLine className="h-3 w-3" /> Slug
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          type: 'lifecycle',
                          cat,
                          expiresAt: cat.expiresAt
                            ? cat.expiresAt.slice(0, 10)
                            : '',
                          nextStatus: cat.status,
                          reason: '',
                        })
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <CalendarPlus className="h-3 w-3" /> Status/Data
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          type: 'plan',
                          cat,
                          planCode: cat.planType === 'PRO' ? 'PRO_30' : 'ESSENTIAL_30',
                          adjustExpiration: false,
                        })
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <Sparkles className="h-3 w-3" /> Plano
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({ type: 'transfer', cat, targetEmail: '' })
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <ArrowRightLeft className="h-3 w-3" /> Transferir
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModal({ type: 'delete', cat, confirmSlug: '' })
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="font-semibold text-zinc-600">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modais de Ação */}
      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModal(null)}
        >
          <form
            onSubmit={handleModalSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-extrabold text-zinc-900">
              {modal.type === 'slug' && `Editar slug — ${modal.cat.storeName}`}
              {modal.type === 'lifecycle' && `Validade & Status — ${modal.cat.storeName}`}
              {modal.type === 'transfer' && `Transferir Vitrine — ${modal.cat.storeName}`}
              {modal.type === 'plan' && `Alterar Plano — ${modal.cat.storeName}`}
              {modal.type === 'delete' && `Excluir Vitrine — ${modal.cat.storeName}`}
            </h3>

            {modal.type === 'slug' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Novo slug (/c/...)
                </label>
                <input
                  type="text"
                  required
                  value={modal.value}
                  onChange={(e) => setModal({ ...modal, value: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            {modal.type === 'lifecycle' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Status
                  </label>
                  <select
                    value={modal.nextStatus}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        nextStatus: e.target.value as CatalogStatus,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Nova data de validade
                  </label>
                  <input
                    type="date"
                    value={modal.expiresAt}
                    onChange={(e) =>
                      setModal({ ...modal, expiresAt: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Motivo (opcional, registrado na auditoria)
                  </label>
                  <input
                    type="text"
                    value={modal.reason}
                    onChange={(e) => setModal({ ...modal, reason: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {modal.type === 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  E-mail do novo lojista (já cadastrado)
                </label>
                <input
                  type="email"
                  required
                  value={modal.targetEmail}
                  onChange={(e) =>
                    setModal({ ...modal, targetEmail: e.target.value })
                  }
                  placeholder="lojista@exemplo.com"
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            {modal.type === 'plan' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Novo Plano
                  </label>
                  <select
                    value={modal.planCode}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        planCode: e.target.value as CatalogPlanCode,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="ESSENTIAL_30">ESSENTIAL_30 (R$ 9,90/mês)</option>
                    <option value="PRO_30">PRO_30 (R$ 14,90/mês)</option>
                    <option value="PRO_365">PRO_365 (R$ 149,00/ano)</option>
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={modal.adjustExpiration}
                    onChange={(e) =>
                      setModal({ ...modal, adjustExpiration: e.target.checked })
                    }
                  />
                  Somar dias do novo plano à validade atual
                </label>
              </div>
            )}

            {modal.type === 'delete' && (
              <div className="space-y-2">
                <p className="text-xs text-red-700">
                  Esta ação apaga produtos, pedidos e imagens do R2 permanentemente. Digite{' '}
                  <strong>{modal.cat.slug}</strong> para confirmar:
                </p>
                <input
                  type="text"
                  required
                  value={modal.confirmSlug}
                  onChange={(e) =>
                    setModal({ ...modal, confirmSlug: e.target.value })
                  }
                  placeholder={modal.cat.slug}
                  className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  (modal.type === 'delete' &&
                    modal.confirmSlug.trim() !== modal.cat.slug)
                }
                className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  modal.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
