import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSafeErrorMessage, resolveEditToken } from '../services/api';
import { applyPageSeo } from '../utils/seo';

export function EditTokenRedirectPage() {
  const { editToken } = useParams<{ editToken: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyPageSeo({
      title: 'Redirecionando — VitriMini',
      description: 'Acesso autenticado ao painel da vitrine.',
      canonicalPath: '/editar',
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (authLoading || !editToken) return;

    if (!user) {
      navigate(`/entrar?redirect=${encodeURIComponent(`/editar/${editToken}`)}`, {
        replace: true,
      });
      return;
    }

    resolveEditToken(editToken)
      .then(({ catalogId }) => {
        navigate(`/painel/${catalogId}`, { replace: true });
      })
      .catch((err) => {
        setError(
          getSafeErrorMessage(
            err,
            'Não foi possível acessar esta vitrine. Verifique se você entrou com a conta proprietária.'
          )
        );
      });
  }, [authLoading, user, editToken, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <h1 className="mt-3 text-lg font-extrabold text-zinc-900">
          Acesso não autorizado
        </h1>
        <p className="mt-1 max-w-sm text-sm text-zinc-600">{error}</p>
        <div className="mt-5 flex gap-2">
          <Link
            to="/minhas-vitrines"
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Minhas Vitrines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 text-zinc-600">
      <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      <p className="text-xs font-semibold">Abrindo painel da vitrine...</p>
    </div>
  );
}
