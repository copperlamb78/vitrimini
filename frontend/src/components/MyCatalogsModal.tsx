import { useState } from 'react';
import { Copy, Check, ExternalLink, Store, X, KeyRound } from 'lucide-react';
import type { SavedCatalogEntry } from '../types/catalog';

interface MyCatalogsModalProps {
  catalogs: SavedCatalogEntry[];
  onClose: () => void;
}

export function MyCatalogsModal({ catalogs, onClose }: MyCatalogsModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">
              Minhas Vitrines Ativas ({catalogs.length})
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

        <p className="mt-2 text-xs text-stone-500">
          Vitrines criadas ou recuperadas neste aparelho. Copie o link público para seus clientes ou o link secreto para editar produtos.
        </p>

        <div className="mt-4 space-y-3">
          {catalogs.map((cat) => {
            const storeUrl = `${origin}/c/${cat.slug}`;
            const editUrl = `${origin}/editar/${cat.editToken}`;
            const storeCopyId = `store_${cat.catalogId}`;
            const editCopyId = `edit_${cat.catalogId}`;

            return (
              <div
                key={cat.catalogId}
                className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-extrabold text-stone-900">
                    {cat.storeName || cat.slug}
                  </h3>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    Ativa
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {/* Link Público */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(storeUrl, storeCopyId)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      {copiedKey === storeCopyId ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Vitrine copiada!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Link da Vitrine
                        </>
                      )}
                    </button>
                    <a
                      href={`/c/${cat.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir Vitrine"
                      className="flex items-center justify-center rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-stone-700 hover:bg-stone-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Link de Edição */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(editUrl, editCopyId)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      {copiedKey === editCopyId ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Edição copiada!
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3.5 w-3.5" />
                          Link de Edição
                        </>
                      )}
                    </button>
                    <a
                      href={`/editar/${cat.editToken}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir Painel de Edição"
                      className="flex items-center justify-center rounded-lg border border-amber-300 bg-white px-2.5 py-2 text-amber-800 hover:bg-amber-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
