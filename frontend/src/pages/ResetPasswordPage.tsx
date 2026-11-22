import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  getSafeErrorMessage,
  resetPasswordWithToken,
} from '../services/api';
import { applyPageSeo } from '../utils/seo';
import logoVitriMini from '../assets/logo-vitrimini.png';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    applyPageSeo({
      title: 'Redefinir Senha — VitriMini',
      description: 'Crie uma nova senha para sua conta VitriMini.',
      canonicalPath: '/redefinir-senha',
      noindex: true,
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token || token.length < 32) {
      setError('Link de redefinição inválido. Solicite um novo link para entrar.');
      return;
    }

    if (password.trim().length < 6) {
      setError('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere com a nova senha.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordWithToken({ token, password });
      setSuccess(true);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Este link de redefinição é inválido ou expirou. Solicite um novo link.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoVitriMini}
              alt="Logo da VitriMini"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>
          <Link
            to="/entrar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para entrar
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {!token ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h1 className="mt-3 text-lg font-extrabold text-zinc-900">
                Link de redefinição inválido
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Este endereço está incompleto ou já foi utilizado. Solicite um novo link na tela de acesso.
              </p>
              <Link
                to="/entrar"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                Ir para a tela de entrada
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="mt-3 text-lg font-extrabold text-zinc-900">
                Senha atualizada com sucesso
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Sua nova senha já está ativa. Entre na sua conta para gerenciar suas vitrines.
              </p>
              <Link
                to="/entrar"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700"
              >
                Entrar na minha conta
              </Link>
            </div>
          ) : (
            <div>
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h1 className="mt-3 text-xl font-extrabold text-zinc-900">
                  Escolha sua nova senha
                </h1>
                <p className="mt-1 text-xs text-zinc-500">
                  Digite uma nova senha segura com pelo menos 6 caracteres.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Nova Senha *
                  </label>
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

                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-rose-600"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando nova senha...
                    </>
                  ) : (
                    'Salvar Nova Senha'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
