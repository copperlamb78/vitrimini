import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  Mail,
  Play,
  Loader2,
  Clock,
  Search,
} from 'lucide-react';
import { AdminToggleSwitch } from './AdminToggleSwitch';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import {
  getAdminRadar,
  runAdminRadarRules,
  sendAdminRadarReminder,
  toggleAdminRadarCron,
} from '../../services/adminApi';
import type { RadarCatalogItem, RadarResponse } from '../../types/admin';

function buildRadarWhatsUrl(cat: RadarCatalogItem) {
  const digits = cat.whatsapp.replace(/\D/g, '');
  const full = digits.startsWith('55') ? digits : `55${digits}`;
  const expDate = cat.expiresAt
    ? new Date(cat.expiresAt).toLocaleDateString('pt-BR')
    : '';
  const statusText =
    cat.daysRemaining < 0
      ? `expirou em ${expDate}`
      : cat.daysRemaining === 0
        ? `vence hoje (${expDate})`
        : `vence em ${expDate}`;
  const msg = encodeURIComponent(
    `Olá, ${cat.user.name.split(' ')[0]}! Aqui é da VitriMini. Passando para lembrar que a vitrine "${cat.storeName}" ${statusText}. Posso te ajudar a renovar em segundos?`
  );
  return `https://wa.me/${full}?text=${msg}`;
}

export function AdminSupportRadarTab({
  onToast,
}: {
  onToast: (msg: string, isError?: boolean) => void;
}) {
  const [data, setData] = useState<RadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 350);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);
  const actionLockRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminRadar(debouncedQ.trim() || undefined);
      setData(res);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao carregar radar.', true);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleCron() {
    if (!data || actionLockRef.current) return;
    actionLockRef.current = true;
    setCronLoading(true);
    try {
      const next = !data.cronEnabled;
      await toggleAdminRadarCron(next);
      setData({ ...data, cronEnabled: next });
      onToast(
        next
          ? 'Régua automática de vencimentos ATIVADA.'
          : 'Régua automática de vencimentos PAUSADA.'
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao alterar cron.', true);
    } finally {
      actionLockRef.current = false;
      setCronLoading(false);
    }
  }

  async function handleRunRules(dryRun: boolean) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyId(dryRun ? 'dry-run' : 'run-rules');
    try {
      const res = await runAdminRadarRules(dryRun);
      if (dryRun) {
        setDryRunResult(
          `Dry-run: ${res.candidates.length} vitrine(s) elegível(is) para D-3/D-0/D+2 agora.`
        );
      } else {
        setDryRunResult(null);
        onToast(`Régua executada: ${res.processed} e-mail(s) enviado(s).`);
        await load();
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao executar régua.', true);
    } finally {
      actionLockRef.current = false;
      setBusyId(null);
    }
  }

  async function handleSendManual(cat: RadarCatalogItem) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyId(cat.id);
    try {
      const res = await sendAdminRadarReminder(cat.id);
      onToast(`Lembrete (${res.stage}) enviado para ${res.recipient}.`);
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao enviar lembrete.', true);
    } finally {
      actionLockRef.current = false;
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controles da Régua */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-extrabold text-zinc-900">
            Régua Automática de Vencimentos (D-3, D-0, D+2)
          </h2>
          <p className="text-xs text-zinc-500">
            Cota Brevo hoje: {data?.quota.sentToday ?? 0} / {data?.quota.limit ?? 300} (trava em 240)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AdminToggleSwitch
            checked={Boolean(data?.cronEnabled)}
            loading={cronLoading}
            activeLabel="Cron: Ativo"
            inactiveLabel="Cron: Pausado"
            ariaLabel="Alternar cron da régua automática"
            onToggle={() => void handleToggleCron()}
          />
          <button
            type="button"
            disabled={busyId !== null}
            aria-busy={busyId === 'dry-run'}
            onClick={() => void handleRunRules(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyId === 'dry-run' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busyId === 'dry-run' ? 'Simulando...' : 'Dry-run'}
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            aria-busy={busyId === 'run-rules'}
            onClick={() => void handleRunRules(false)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyId === 'run-rules' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {busyId === 'run-rules' ? 'Executando...' : 'Executar Agora'}
          </button>
        </div>
      </div>

      {dryRunResult && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-900">
          {dryRunResult}
        </div>
      )}

      {/* Busca */}
      <div className="relative rounded-2xl border border-zinc-200 bg-white p-3">
        <Search className="pointer-events-none absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar radar por loja, slug ou e-mail..."
          className="w-full rounded-xl border border-zinc-200 py-2 pr-3 pl-9 text-xs outline-none focus:border-rose-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-xs text-zinc-500">
          Nenhuma vitrine vencendo nos próximos 7 dias ou expirada nos últimos 15 dias.
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.items.map((cat) => {
            const hasWhats = cat.whatsapp.replace(/\D/g, '').length >= 10;
            return (
              <div
                key={cat.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-zinc-900">
                      {cat.storeName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        cat.urgency === 'EXPIRED'
                          ? 'bg-red-100 text-red-800'
                          : cat.urgency === 'CRITICAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {cat.daysRemaining < 0
                        ? `Expirou há ${Math.abs(cat.daysRemaining)}d`
                        : cat.daysRemaining === 0
                          ? 'Vence hoje'
                          : `Vence em ${cat.daysRemaining}d`}
                    </span>
                    {cat.lastExpirationNoticeStage && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                        Último aviso: {cat.lastExpirationNoticeStage}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    /c/{cat.slug} • {cat.user.name} ({cat.user.email})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasWhats ? (
                    <a
                      href={buildRadarWhatsUrl(cat)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Chamar no Whats
                    </a>
                  ) : (
                    <span className="rounded-xl bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold text-zinc-400">
                      Sem WhatsApp
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={busyId === cat.id}
                    aria-busy={busyId === cat.id}
                    onClick={() => void handleSendManual(cat)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyId === cat.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    {busyId === cat.id ? 'Enviando...' : 'Enviar Lembrete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
