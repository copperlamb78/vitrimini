import { useState } from 'react';
import {
  X,
  Loader2,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getSafeErrorMessage,
  requestPasswordReset,
} from '../services/api';
import {
  formatPhoneMask,
  isValidBrazilianPhone,
  isValidEmail,
  normalizeEmailInput,
  phoneToDDI,
} from '../utils/format';
import type { AuthResponse } from '../types/catalog';
import logoVitriMini from '../assets/logo-vitrimini.png';

interface AuthModalProps {
  initialTab?: 'register' | 'login';
  defaultPhone?: string;
  headline?: string;
  subheadline?: string;
  onClose: () => void;
  onSuccess: (auth: AuthResponse) => void;
}

export function AuthModal({
  initialTab = 'register',
  defaultPhone = '',
  headline = 'Crie sua conta em 10 segundos para salvar e gerenciar sua vitrine',
  subheadline = 'Com sua conta você edita produtos, pausa itens esgotados e renova suas vitrines quando quiser.',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const { login, register } = useAuth();

  const [tab, setTab] = useState<'register' | 'login' | 'forgot'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState(() => formatPhoneMask(defaultPhone));
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const emailInvalid =
    emailTouched && email.trim().length > 0 && !isValidEmail(email);
  const phoneInvalid =
    tab === 'register' &&
    phoneTouched &&
    phone.trim().length > 0 &&
    !isValidBrazilianPhone(phone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailTouched(true);
    setPhoneTouched(true);

    const normalizedEmail = normalizeEmailInput(email);
    if (!isValidEmail(normalizedEmail)) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }

    if (tab === 'forgot') {
      setSubmitting(true);
      try {
        await requestPasswordReset(normalizedEmail);
        setResetSent(true);
      } catch (err) {
        setError(
          getSafeErrorMessage(
            err,
            'Não foi possível enviar o link agora. Tente novamente.'
          )
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (tab === 'register') {
      if (name.trim().length < 2) {
        setError('Informe seu nome completo.');
        return;
      }
      if (!isValidBrazilianPhone(phone)) {
        setError('Informe um WhatsApp válido com DDD: (99) 99999-9999.');
        return;
      }
      if (password.trim().length < 6) {
        setError(
          'A senha precisa ter pelo menos 6 caracteres (sem contar espaços no início ou no fim).'
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      if (tab === 'register') {
        if (!acceptTerms) {
          setError(
            'Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.'
          );
          return;
        }
        const res = await register({
          name: name.trim(),
          email: normalizedEmail,
          phone: phoneToDDI(phone),
          password,
          acceptTerms: true,
        });
        onSuccess(res);
      } else {
        const res = await login({
          email: normalizedEmail,
          password,
        });
        onSuccess(res);
      }
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Não foi possível entrar agora. Confira seus dados e tente novamente.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <img
            src={logoVitriMini}
            alt="VitriMini"
            className="mx-auto mb-3 h-8 w-auto object-contain"
          />
          <h2 className="text-lg font-extrabold text-zinc-900">
            {tab === 'forgot' ? 'Recuperar senha' : headline}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {tab === 'forgot'
              ? 'Informe seu e-mail cadastrado para receber o link de redefinição.'
              : subheadline}
          </p>
        </div>

        {tab === 'forgot' ? (
          resetSent ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-2 text-xs font-bold text-emerald-900">
                  Verifique seu e-mail
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                  Se o endereço <strong>{normalizeEmailInput(email)}</strong> estiver cadastrado, enviamos um link válido por 30 minutos para criar uma nova senha.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetSent(false);
                  setTab('login');
                  setError(null);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para entrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  E-mail cadastrado *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value.toLowerCase().trimStart())
                  }
                  onBlur={() => {
                    setEmail((v) => normalizeEmailInput(v));
                    setEmailTouched(true);
                  }}
                  placeholder="seuemail@exemplo.com"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ${
                    emailInvalid
                      ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                      : 'border-zinc-300 focus:border-rose-600'
                  }`}
                />
                {emailInvalid && (
                  <p className="mt-1 text-[11px] font-medium text-red-600">
                    Formato de e-mail inválido (ex: nome@email.com).
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando link...
                  </>
                ) : (
                  'Enviar link'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                }}
                className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para entrar
              </button>
            </form>
          )
        ) : (
          <>
            {/* Abas Criar Conta / Entrar */}
            <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  tab === 'register'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Criar Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  tab === 'login'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                Já tenho conta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria Oliveira"
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-rose-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value.toLowerCase().trimStart())
                  }
                  onBlur={() => {
                    setEmail((v) => normalizeEmailInput(v));
                    setEmailTouched(true);
                  }}
                  placeholder="seuemail@exemplo.com"
                  className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ${
                    emailInvalid
                      ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                      : 'border-zinc-300 focus:border-rose-600'
                  }`}
                />
                {emailInvalid && (
                  <p className="mt-1 text-[11px] font-medium text-red-600">
                    Formato de e-mail inválido (ex: nome@email.com).
                  </p>
                )}
              </div>

              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    WhatsApp (com DDD) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    required
                    value={phone}
                    onChange={(e) =>
                      setPhone(formatPhoneMask(e.target.value))
                    }
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="(75) 99999-9999"
                    className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ${
                      phoneInvalid
                        ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                        : 'border-zinc-300 focus:border-rose-600'
                    }`}
                  />
                  {phoneInvalid && (
                    <p className="mt-1 text-[11px] font-medium text-red-600">
                      Informe DDD + número válido com 10 ou 11 dígitos.
                    </p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Senha *
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setResetSent(false);
                        setError(null);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-zinc-300 py-2.5 pl-3.5 pr-10 text-sm outline-none focus:border-rose-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Mostrar ou ocultar senha"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {tab === 'register' && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50/70 p-3 text-xs leading-relaxed text-stone-600">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-stone-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    Li e aceito os{' '}
                    <a
                      href="/termos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-rose-600 underline hover:text-rose-700"
                    >
                      Termos de Uso
                    </a>{' '}
                    e a{' '}
                    <a
                      href="/privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-rose-600 underline hover:text-rose-700"
                    >
                      Política de Privacidade
                    </a>{' '}
                    da VitriMini.
                  </span>
                </label>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (tab === 'register' && !acceptTerms)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : tab === 'register' ? (
                  'Criar conta e continuar'
                ) : (
                  'Entrar e continuar'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
