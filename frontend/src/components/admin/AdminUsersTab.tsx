import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserCheck,
  Mail,
  KeyRound,
  MessageCircle,
  Loader2,
  Copy,
} from 'lucide-react';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { useAuth } from '../../contexts/AuthContext';
import {
  generateResetLinkAdminUser,
  impersonateAdminUser,
  listAdminUsers,
  resendWelcomeAdminUser,
} from '../../services/adminApi';
import type { AdminUserItem } from '../../types/admin';

function buildWhatsUrl(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '');
  const full = digits.startsWith('55') ? digits : `55${digits}`;
  const msg = encodeURIComponent(
    `Olá, ${name.split(' ')[0]}! Aqui é da equipe VitriMini. Tudo bem?`
  );
  return `https://wa.me/${full}?text=${msg}`;
}

export function AdminUsersTab({
  onToast,
}: {
  onToast: (msg: string, isError?: boolean) => void;
}) {
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 350);
  const [role, setRole] = useState<'MERCHANT' | 'BUYER' | ''>('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const actionLockRef = useRef(false);
  const [resetLinkModal, setResetLinkModal] = useState<{
    email: string;
    url: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminUsers({
        page,
        pageSize: 15,
        q: debouncedQ.trim() || undefined,
        role,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao listar usuários.', true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, role, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleImpersonate(u: AdminUserItem) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyKey(`imp:${u.id}`);
    try {
      const res = await impersonateAdminUser(u.id);
      startImpersonation(res.token, res.user);
      navigate('/minhas-vitrines');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao iniciar suporte.', true);
    } finally {
      actionLockRef.current = false;
      setBusyKey(null);
    }
  }

  async function handleResendWelcome(u: AdminUserItem) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyKey(`welcome:${u.id}`);
    try {
      await resendWelcomeAdminUser(u.id);
      onToast(`Boas-vindas reenviado para ${u.email}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao reenviar.', true);
    } finally {
      actionLockRef.current = false;
      setBusyKey(null);
    }
  }

  async function handleResetLink(u: AdminUserItem, sendEmail: boolean) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyKey(`reset:${u.id}`);
    try {
      const res = await generateResetLinkAdminUser(u.id, sendEmail);
      if (sendEmail) {
        onToast(`E-mail de redefinição enviado para ${u.email}.`);
      } else {
        setResetLinkModal({ email: u.email, url: res.resetUrl });
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erro ao gerar link.', true);
    } finally {
      actionLockRef.current = false;
      setBusyKey(null);
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
            placeholder="Buscar nome, e-mail ou telefone..."
            className="w-full rounded-xl border border-zinc-200 py-2 pr-3 pl-9 text-xs outline-none focus:border-rose-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value as 'MERCHANT' | 'BUYER' | '');
          }}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700"
        >
          <option value="">Todos</option>
          <option value="MERCHANT">Lojistas</option>
          <option value="BUYER">Compradores</option>
        </select>
        <span className="text-xs font-semibold text-zinc-500">{total} usuário(s)</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((u) => {
            const whatsNumber = u.primaryCatalog?.whatsapp || u.phone;
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-zinc-900">
                      {u.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.role === 'MERCHANT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {u.role === 'MERCHANT' ? 'Lojista' : 'Comprador'}
                    </span>
                    {u.isAdmin && (
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        Super Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {u.email} • {u.catalogsCount} vitrine(s) • {u.ordersCount} pedido(s)
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Cadastro: {new Date(u.createdAt).toLocaleDateString('pt-BR')} •
                    Último login:{' '}
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {!u.isAdmin && (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      aria-busy={busyKey === `imp:${u.id}`}
                      onClick={() => void handleImpersonate(u)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-zinc-950 shadow-2xs transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyKey === `imp:${u.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      {busyKey === `imp:${u.id}` ? 'Entrando...' : 'Entrar como'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    aria-busy={busyKey === `welcome:${u.id}`}
                    onClick={() => void handleResendWelcome(u)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `welcome:${u.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    {busyKey === `welcome:${u.id}` ? 'Enviando...' : 'Boas-vindas'}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    aria-busy={busyKey === `reset:${u.id}`}
                    onClick={() => void handleResetLink(u, false)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `reset:${u.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="h-3.5 w-3.5" />
                    )}
                    {busyKey === `reset:${u.id}` ? 'Gerando...' : 'Link Senha'}
                  </button>
                  {whatsNumber && whatsNumber.replace(/\D/g, '').length >= 10 && (
                    <a
                      href={buildWhatsUrl(whatsNumber, u.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Whats
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
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
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {resetLinkModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setResetLinkModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-sm font-extrabold text-zinc-900">
              Link de redefinição — {resetLinkModal.email}
            </h3>
            <input
              type="text"
              readOnly
              value={resetLinkModal.url}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(resetLinkModal.url);
                  onToast('Link copiado!');
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </button>
              <button
                type="button"
                onClick={() => setResetLinkModal(null)}
                className="cursor-pointer rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
