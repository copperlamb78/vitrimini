import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Search,
  Loader2,
  Copy,
  Trash2,
  X,
} from 'lucide-react';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import {
  listAdminErrors,
  purgeAdminResolvedErrors,
  updateAdminErrorStatus,
} from '../../services/adminApi';
import type { SystemErrorItem, SystemErrorsResponse } from '../../types/admin';

function buildDebugMarkdown(err: SystemErrorItem) {
  return [
    `### Relatório de Erro — VitriMini`,
    `- **Source:** ${err.source} | **Severity:** ${err.severity} | **Category:** ${err.category}`,
    `- **Route:** ${err.method || ''} ${err.route || 'N/A'} (HTTP ${err.statusCode ?? 'N/A'})`,
    `- **Ocorrências:** ${err.occurrenceCount} (1ª vez: ${err.firstSeenAt} | Última: ${err.lastSeenAt})`,
    `- **User / Catalog:** userId=${err.userId || 'N/A'} | catalogId=${err.catalogId || 'N/A'}`,
    `- **Mensagem:** \`${err.message}\``,
    err.stack ? `\n\`\`\`\n${err.stack}\n\`\`\`` : '',
    err.contextJson
      ? `\n**Contexto:**\n\`\`\`json\n${JSON.stringify(err.contextJson, null, 2)}\n\`\`\``
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function AdminErrorsTab({
  onToast,
  onErrorsChanged,
}: {
  onToast: (msg: string, isError?: boolean) => void;
  onErrorsChanged?: () => void;
}) {
  const [data, setData] = useState<SystemErrorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('OPEN');
  const [source, setSource] = useState('');
  const [severity, setSeverity] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 350);
  const [selected, setSelected] = useState<SystemErrorItem | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const actionLockRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminErrors({
        page,
        pageSize: 15,
        status,
        source,
        severity,
        q: debouncedQ.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao listar falhas.', true);
    } finally {
      setLoading(false);
    }
  }, [page, status, source, severity, debouncedQ, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(
    errItem: SystemErrorItem,
    nextStatus: SystemErrorItem['status']
  ) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setSaving(true);
    try {
      await updateAdminErrorStatus(errItem.id, {
        status: nextStatus,
        resolutionNote: note || undefined,
      });
      onToast(`Erro marcado como ${nextStatus}.`);
      setSelected(null);
      setNote('');
      await load();
      onErrorsChanged?.();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao atualizar status.', true);
    } finally {
      actionLockRef.current = false;
      setSaving(false);
    }
  }

  async function handlePurgeResolved() {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setSaving(true);
    try {
      const res = await purgeAdminResolvedErrors();
      onToast(`${res.deletedCount} erro(s) resolvido(s)/ignorado(s) limpo(s).`);
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao limpar.', true);
    } finally {
      actionLockRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5">
            <p className="text-[11px] font-semibold text-zinc-500">Erros Abertos</p>
            <p className="mt-1 text-xl font-extrabold text-red-600">
              {data.summary.openCount}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5">
            <p className="text-[11px] font-semibold text-zinc-500">Críticos (24h)</p>
            <p className="mt-1 text-xl font-extrabold text-zinc-900">
              {data.summary.critical24hCount}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5">
            <p className="text-[11px] font-semibold text-zinc-500">Frontend vs Backend</p>
            <p className="mt-1 text-sm font-extrabold text-zinc-900">
              {data.summary.frontendOpenCount} Front / {data.summary.backendOpenCount} Back
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5">
            <p className="text-[11px] font-semibold text-zinc-500">Pagamentos / Webhook</p>
            <p className="mt-1 text-xl font-extrabold text-amber-600">
              {data.summary.paymentOpenCount}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar mensagem ou rota..."
            className="w-full rounded-xl border border-zinc-200 py-2 pr-3 pl-9 text-xs outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold"
        >
          <option value="">Todos status</option>
          <option value="OPEN">OPEN</option>
          <option value="INVESTIGATING">INVESTIGATING</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="IGNORED">IGNORED</option>
        </select>
        <select
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value);
          }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold"
        >
          <option value="">Todas origens</option>
          <option value="BACKEND">BACKEND</option>
          <option value="FRONTEND">FRONTEND</option>
          <option value="WEBHOOK">WEBHOOK</option>
          <option value="CRON">CRON</option>
          <option value="EMAIL">EMAIL</option>
        </select>
        <select
          value={severity}
          onChange={(e) => {
            setPage(1);
            setSeverity(e.target.value);
          }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold"
        >
          <option value="">Severidade</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="ERROR">ERROR</option>
          <option value="WARNING">WARNING</option>
        </select>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handlePurgeResolved()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Limpar resolvidos
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-xs text-zinc-500">
          Nenhum erro encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.items.map((errItem) => (
            <button
              key={errItem.id}
              type="button"
              onClick={() => {
                setSelected(errItem);
                setNote(errItem.resolutionNote || '');
              }}
              className="block w-full cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      errItem.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : errItem.severity === 'ERROR'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {errItem.severity}
                  </span>
                  <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    {errItem.source}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                    {errItem.category}
                  </span>
                  <span className="text-xs font-bold text-rose-600">
                    {errItem.occurrenceCount}x
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Último: {new Date(errItem.lastSeenAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs font-bold text-zinc-900">
                {errItem.message}
              </p>
              {errItem.route && (
                <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                  {errItem.method ? `${errItem.method} ` : ''}
                  {errItem.route}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="font-semibold text-zinc-600">
            Página {page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-sm font-extrabold text-zinc-900">
                  Detalhes do Erro ({selected.occurrenceCount}x)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-zinc-50 p-3 text-xs">
              <p className="font-bold text-zinc-900">{selected.message}</p>
              <p className="mt-1 text-zinc-500">
                Rota: {selected.method || ''} {selected.route || '—'} • 1ª vez:{' '}
                {new Date(selected.firstSeenAt).toLocaleString('pt-BR')}
              </p>
              {(selected.userId || selected.catalogId) && (
                <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                  userId={selected.userId || '—'} | catalogId={selected.catalogId || '—'}
                </p>
              )}
            </div>

            {selected.stack && (
              <pre className="max-h-48 overflow-auto rounded-xl bg-zinc-950 p-3 text-[11px] text-zinc-100">
                {selected.stack}
              </pre>
            )}

            {Boolean(selected.contextJson) && (
              <pre className="max-h-36 overflow-auto rounded-xl bg-zinc-100 p-3 text-[11px] text-zinc-800">
                {JSON.stringify(selected.contextJson, null, 2)}
              </pre>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Nota de resolução (opcional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Corrigido no commit X / Ruído de bot"
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(buildDebugMarkdown(selected));
                  onToast('Relatório Markdown copiado para debug!');
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar relatório para debug
              </button>

              <div className="flex flex-wrap gap-1.5">
                {(['INVESTIGATING', 'RESOLVED', 'IGNORED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={saving}
                    onClick={() => void handleStatusChange(selected, st)}
                    className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold text-white ${
                      st === 'RESOLVED'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : st === 'INVESTIGATING'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-zinc-600 hover:bg-zinc-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
