import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function ImpersonationBanner() {
  const { user, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  if (!user?.isImpersonation) {
    return null;
  }

  async function handleBackToAdmin() {
    setExiting(true);
    try {
      await stopImpersonation();
      navigate('/super-admin');
    } finally {
      setExiting(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-500 px-3 py-2 text-zinc-950 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs font-bold sm:text-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            Modo Suporte: visualizando como <span className="underline">{user.email}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleBackToAdmin()}
          disabled={exiting}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {exiting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5" />
          )}
          Voltar para o Admin
        </button>
      </div>
    </div>
  );
}
