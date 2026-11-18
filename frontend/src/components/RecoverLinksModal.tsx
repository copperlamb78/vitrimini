import { useState } from 'react';
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Loader2,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { RecoveredCatalogItem } from '../types/catalog';
import { getSafeErrorMessage, recoverCatalogs } from '../services/api';

interface RecoverLinksModalProps {
  onClose: () => void;
  onRecovered: (items: RecoveredCatalogItem[]) => void;
}

export function RecoverLinksModal({
  onClose,
  onRecovered,
}: RecoverLinksModalProps) {
  const [whatsapp, setWhatsapp] = useState('');
  const [verifier, setVerifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecoveredCatalogItem[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);

    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 10 || verifier.trim().length < 2) {
      setError(
        'Preencha o WhatsApp com DDD e a Chave Pix (ou nome exato da loja).'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await recoverCatalogs(digits, verifier.trim());
      setResults(res.catalogs);
      onRecovered(res.catalogs);
    } catch (err) {
      setError(
        getSafeErrorMessage(
          err,
          'Nenhuma vitrine ativa encontrada. Confira os dados informados e tente novamente.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const origin = window.location.origin;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-stone-800" />
            <h2 className="text-base font-bold text-stone-900">
              Recuperar Meus Links
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-stone-500">
          Limpou o navegador ou trocou de celular? Informe os dois dados cadastrados na sua vitrine paga para recuperar seus links com segurança:
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700">
              1. WhatsApp cadastrado na loja *
            </label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ex: 5575999999999"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700">
              2. Chave Pix cadastrada (ou nome exato da loja) *
            </label>
            <input
              type="text"
              required
              value={verifier}
              onChange={(e) => setVerifier(e.target.value)}
              placeholder="Sua chave Pix ou nome exato da loja"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-stone-900"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-stone-800 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando vitrines ativas...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Localizar Meus Links
              </>
            )}
          </button>
        </form>

        {results && results.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-stone-200 pt-4">
            <p className="text-xs font-bold text-emerald-700">
              Encontramos {results.length}{' '}
              {results.length === 1 ? 'vitrine ativa' : 'vitrines ativas'}! Os links também foram salvos neste aparelho:
            </p>

            {results.map((cat) => {
              const storeUrl = `${origin}/c/${cat.slug}`;
              const editUrl = `${origin}/editar/${cat.editToken}`;
              const storeCopyId = `rec_store_${cat.catalogId}`;
              const editCopyId = `rec_edit_${cat.catalogId}`;

              return (
                <div
                  key={cat.catalogId}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2"
                >
                  <p className="truncate text-sm font-extrabold text-stone-900">
                    {cat.storeName}
                  </p>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(storeUrl, storeCopyId)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      {copiedKey === storeCopyId ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedKey === storeCopyId
                        ? 'Copiado!'
                        : 'Copiar Link da Vitrine'}
                    </button>
                    <a
                      href={`/c/${cat.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-stone-700 hover:bg-stone-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(editUrl, editCopyId)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      {copiedKey === editCopyId ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                      )}
                      {copiedKey === editCopyId
                        ? 'Copiado!'
                        : 'Copiar Link Secreto de Edição'}
                    </button>
                    <a
                      href={`/editar/${cat.editToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center rounded-lg border border-amber-300 bg-white px-2.5 py-2 text-amber-800 hover:bg-amber-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
