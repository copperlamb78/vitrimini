import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Ticket,
  Megaphone,
  Mail,
  History,
  Copy,
  Plus,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { AdminToggleSwitch } from './AdminToggleSwitch';
import {
  createAdminAnnouncement,
  createAdminCoupon,
  listAdminAnnouncements,
  listAdminAuditLogs,
  listAdminCoupons,
  listAdminEmails,
  retryAdminEmail,
  updateAdminAnnouncement,
  updateAdminCoupon,
} from '../../services/adminApi';
import type {
  AdminEmailLogItem,
  AuditLogItem,
  GlobalAnnouncementItem,
  PromoCouponItem,
} from '../../types/admin';
import type { CatalogPlanCode } from '../../types/catalog';

export function AdminGrowthAuditTab({
  onToast,
}: {
  onToast: (msg: string, isError?: boolean) => void;
}) {
  const [section, setSection] = useState<'coupons' | 'announcements' | 'emails' | 'audit'>(
    'coupons'
  );
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<PromoCouponItem[]>([]);
  const [announcements, setAnnouncements] = useState<GlobalAnnouncementItem[]>([]);
  const [emails, setEmails] = useState<AdminEmailLogItem[]>([]);
  const [audits, setAudits] = useState<AuditLogItem[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditLogItem | null>(null);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [creatingAnn, setCreatingAnn] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    bonusDays: 30,
    targetPlanCode: 'PRO_30' as CatalogPlanCode | '',
    maxUses: '',
  });
  const [newAnn, setNewAnn] = useState({
    title: '',
    message: '',
    variant: 'INFO' as 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO',
    ctaLabel: '',
    ctaUrl: '',
    isActive: true,
    dismissible: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (section === 'coupons') {
        const res = await listAdminCoupons({ page: 1, pageSize: 30 });
        setCoupons(res.items);
      } else if (section === 'announcements') {
        const res = await listAdminAnnouncements();
        setAnnouncements(res.items);
      } else if (section === 'emails') {
        const res = await listAdminEmails({ page: 1, pageSize: 30 });
        setEmails(res.items);
      } else {
        const res = await listAdminAuditLogs({ page: 1, pageSize: 30 });
        setAudits(res.items);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao carregar dados.', true);
    } finally {
      setLoading(false);
    }
  }, [section, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setCreatingCoupon(true);
    try {
      await createAdminCoupon({
        code: newCoupon.code,
        description: newCoupon.description || undefined,
        type: 'EXTENDED_TRIAL',
        bonusDays: Number(newCoupon.bonusDays) || 30,
        targetPlanCode: newCoupon.targetPlanCode || null,
        maxUses: newCoupon.maxUses ? Number(newCoupon.maxUses) : null,
      });
      setNewCoupon({
        code: '',
        description: '',
        bonusDays: 30,
        targetPlanCode: 'PRO_30',
        maxUses: '',
      });
      onToast('Cupom criado com sucesso.');
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao criar cupom.', true);
    } finally {
      submitLockRef.current = false;
      setCreatingCoupon(false);
    }
  }

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setCreatingAnn(true);
    try {
      await createAdminAnnouncement({
        title: newAnn.title,
        message: newAnn.message,
        variant: newAnn.variant,
        ctaLabel: newAnn.ctaLabel || null,
        ctaUrl: newAnn.ctaUrl || null,
        isActive: newAnn.isActive,
        dismissible: newAnn.dismissible,
      });
      setNewAnn({
        title: '',
        message: '',
        variant: 'INFO',
        ctaLabel: '',
        ctaUrl: '',
        isActive: true,
        dismissible: true,
      });
      onToast('Aviso global salvo.');
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao salvar aviso.', true);
    } finally {
      submitLockRef.current = false;
      setCreatingAnn(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'coupons', label: 'Cupons', icon: Ticket },
          { id: 'announcements', label: 'Aviso Global', icon: Megaphone },
          { id: 'emails', label: 'E-mails Brevo', icon: Mail },
          { id: 'audit', label: 'Auditoria', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setSection(
                  tab.id as 'coupons' | 'announcements' | 'emails' | 'audit'
                )
              }
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
                section === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : section === 'coupons' ? (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateCoupon}
            className="grid grid-cols-1 gap-2.5 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-5"
          >
            <input
              type="text"
              required
              value={newCoupon.code}
              onChange={(e) =>
                setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })
              }
              placeholder="Código (ex: FEIRA30)"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-bold uppercase"
            />
            <input
              type="number"
              required
              min={1}
              max={365}
              value={newCoupon.bonusDays}
              onChange={(e) =>
                setNewCoupon({ ...newCoupon, bonusDays: Number(e.target.value) })
              }
              placeholder="Dias grátis"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs"
            />
            <select
              value={newCoupon.targetPlanCode}
              onChange={(e) =>
                setNewCoupon({
                  ...newCoupon,
                  targetPlanCode: e.target.value as CatalogPlanCode | '',
                })
              }
              className="cursor-pointer rounded-xl border border-zinc-300 px-3 py-2 text-xs"
            >
              <option value="PRO_30">PRO_30</option>
              <option value="ESSENTIAL_30">ESSENTIAL_30</option>
              <option value="PRO_365">PRO_365</option>
            </select>
            <input
              type="number"
              min={1}
              value={newCoupon.maxUses}
              onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
              placeholder="Máx usos (vazio=ilimit.)"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={creatingCoupon}
              aria-busy={creatingCoupon}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingCoupon ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Criar Cupom
                </>
              )}
            </button>
          </form>

          <div className="space-y-2">
            {coupons.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-xs"
              >
                <div>
                  <span className="font-mono text-sm font-extrabold text-zinc-900">
                    {c.code}
                  </span>
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    +{c.bonusDays}d ({c.targetPlanCode || 'PRO'})
                  </span>
                  <p className="mt-0.5 text-zinc-500">
                    Usos: {c.usedCount} / {c.maxUses ?? '∞'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `https://vitrimini.com.br/criar?cupom=${c.code}`
                      );
                      onToast('Link promocional copiado!');
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 active:scale-[0.98]"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar link
                  </button>
                  <AdminToggleSwitch
                    checked={c.isActive}
                    loading={busyItemId === `coupon:${c.id}`}
                    activeLabel="Ativo"
                    inactiveLabel="Desativado"
                    ariaLabel={`Alternar cupom ${c.code}`}
                    onToggle={async () => {
                      if (busyItemId) return;
                      setBusyItemId(`coupon:${c.id}`);
                      try {
                        await updateAdminCoupon(c.id, { isActive: !c.isActive });
                        onToast(
                          `Cupom ${c.code} ${!c.isActive ? 'ativado' : 'desativado'}.`
                        );
                        await load();
                      } catch (err) {
                        onToast(
                          err instanceof Error ? err.message : 'Erro ao atualizar cupom.',
                          true
                        );
                      } finally {
                        setBusyItemId(null);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : section === 'announcements' ? (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateAnnouncement}
            className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 text-xs"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                required
                value={newAnn.title}
                onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                placeholder="Título do aviso"
                className="rounded-xl border border-zinc-300 px-3 py-2 sm:col-span-2"
              />
              <select
                value={newAnn.variant}
                onChange={(e) =>
                  setNewAnn({
                    ...newAnn,
                    variant: e.target.value as 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO',
                  })
                }
                className="cursor-pointer rounded-xl border border-zinc-300 px-3 py-2"
              >
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="PROMO">PROMO</option>
              </select>
            </div>
            <textarea
              required
              rows={2}
              value={newAnn.message}
              onChange={(e) => setNewAnn({ ...newAnn, message: e.target.value })}
              placeholder="Mensagem para todos os lojistas em /minhas-vitrines..."
              className="w-full rounded-xl border border-zinc-300 px-3 py-2"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                value={newAnn.ctaLabel}
                onChange={(e) => setNewAnn({ ...newAnn, ctaLabel: e.target.value })}
                placeholder="Texto CTA (opcional)"
                className="rounded-xl border border-zinc-300 px-3 py-2"
              />
              <input
                type="text"
                value={newAnn.ctaUrl}
                onChange={(e) => setNewAnn({ ...newAnn, ctaUrl: e.target.value })}
                placeholder="URL CTA (/criar ou https://...)"
                className="rounded-xl border border-zinc-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={creatingAnn}
                aria-busy={creatingAnn}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-bold text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingAnn && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {creatingAnn ? 'Publicando...' : 'Publicar Aviso Global'}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-xs"
              >
                <div>
                  <span className="font-extrabold text-zinc-900">{a.title}</span>
                  <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold">
                    {a.variant}
                  </span>
                  <p className="mt-0.5 text-zinc-500">{a.message}</p>
                </div>
                <AdminToggleSwitch
                  checked={a.isActive}
                  loading={busyItemId === `ann:${a.id}`}
                  activeLabel="Ativo"
                  inactiveLabel="Desativado"
                  ariaLabel={`Alternar aviso ${a.title}`}
                  onToggle={async () => {
                    if (busyItemId) return;
                    setBusyItemId(`ann:${a.id}`);
                    try {
                      await updateAdminAnnouncement(a.id, { isActive: !a.isActive });
                      onToast(
                        `Aviso "${a.title}" ${!a.isActive ? 'ativado' : 'desativado'}.`
                      );
                      await load();
                    } catch (err) {
                      onToast(
                        err instanceof Error ? err.message : 'Erro ao atualizar aviso.',
                        true
                      );
                    } finally {
                      setBusyItemId(null);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : section === 'emails' ? (
        <div className="space-y-2">
          {emails.map((em) => (
            <div
              key={em.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-3.5 text-xs"
            >
              <div>
                <span className="font-bold text-zinc-900">{em.type}</span>
                <span className="ml-2 text-zinc-500">{em.recipient}</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    em.status === 'SENT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {em.status}
                </span>
                {em.errorMessage && (
                  <p className="mt-0.5 text-[11px] text-red-600">{em.errorMessage}</p>
                )}
              </div>
              {em.status === 'FAILED' && (
                <button
                  type="button"
                  disabled={busyItemId === `email:${em.id}`}
                  aria-busy={busyItemId === `email:${em.id}`}
                  onClick={async () => {
                    if (busyItemId) return;
                    setBusyItemId(`email:${em.id}`);
                    try {
                      await retryAdminEmail(em.id);
                      onToast('E-mail reenviado!');
                      await load();
                    } catch (err) {
                      onToast(
                        err instanceof Error ? err.message : 'Erro ao reenviar.',
                        true
                      );
                    } finally {
                      setBusyItemId(null);
                    }
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 font-bold text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${
                      busyItemId === `email:${em.id}` ? 'animate-spin' : ''
                    }`}
                  />{' '}
                  {busyItemId === `email:${em.id}` ? 'Reenviando...' : 'Reenviar'}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {audits.map((au) => (
            <button
              key={au.id}
              type="button"
              onClick={() => setSelectedAudit(au)}
              className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-3.5 text-left text-xs hover:border-zinc-300"
            >
              <div>
                <span className="rounded-lg bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  {au.action}
                </span>
                <span className="ml-2 font-bold text-zinc-900">
                  {au.targetType}: {au.targetLabel || au.targetId}
                </span>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Por {au.adminEmail}
                </p>
              </div>
              <span className="text-[11px] text-zinc-400">
                {new Date(au.createdAt).toLocaleString('pt-BR')}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedAudit && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedAudit(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-5 text-xs shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-zinc-900">
                Auditoria: {selectedAudit.action}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {Boolean(selectedAudit.beforeJson) && (
              <div>
                <p className="font-bold text-zinc-700">Antes:</p>
                <pre className="mt-1 overflow-auto rounded-xl bg-zinc-100 p-2.5 text-[11px]">
                  {JSON.stringify(selectedAudit.beforeJson, null, 2)}
                </pre>
              </div>
            )}
            {Boolean(selectedAudit.afterJson) && (
              <div>
                <p className="font-bold text-zinc-700">Depois:</p>
                <pre className="mt-1 overflow-auto rounded-xl bg-emerald-50 p-2.5 text-[11px]">
                  {JSON.stringify(selectedAudit.afterJson, null, 2)}
                </pre>
              </div>
            )}
            {Boolean(selectedAudit.metadata) && (
              <div>
                <p className="font-bold text-zinc-700">Metadados:</p>
                <pre className="mt-1 overflow-auto rounded-xl bg-zinc-50 p-2.5 text-[11px]">
                  {JSON.stringify(selectedAudit.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
