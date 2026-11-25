import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowUp,
  Store,
  LogIn,
  FileText,
  Mail,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LEGAL_DOCS } from '../data/legalDocs';
import { NICHE_LINKS_LIST } from '../data/nichePages';
import logoVitriMini from '../assets/logo-vitrimini.png';

type LegalDocType = 'terms' | 'privacy' | null;

export function Footer() {
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleGoToCreate() {
    if (location.pathname === '/criar') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/criar');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const activeDocument = legalDoc ? LEGAL_DOCS[legalDoc] : null;

  return (
    <>
      <footer className="mt-16 border-t border-zinc-200 bg-white text-zinc-700">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
            {/* Coluna 1 — Marca e Proposta de Valor */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <img
                  src={logoVitriMini}
                  alt="Logo da VitriMini"
                  className="h-9 w-auto object-contain"
                />
              </div>

              <p className="text-xs leading-relaxed text-zinc-600">
                Sua vitrine digital de encomendas pronta em 2 minutos. 0% de comissão, sem app e com pedidos direto no WhatsApp.
              </p>

              <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-[11px] font-semibold text-rose-700">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
                <span>
                  Teste grátis por 15 dias • Liberação imediata • Produtos ilimitados
                </span>
              </div>
            </div>

            {/* Coluna 2 — Acesso Rápido */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
                Acesso Rápido
              </h3>
              <ul className="space-y-2 text-xs font-medium text-zinc-600">
                <li>
                  <button
                    type="button"
                    onClick={handleGoToCreate}
                    className="inline-flex items-center gap-1.5 transition hover:text-[#E11D48]"
                  >
                    <ArrowUp className="h-3.5 w-3.5 text-zinc-400" />
                    Criar vitrine
                  </button>
                </li>
                <li>
                  {user ? (
                    <Link
                      to="/minhas-vitrines"
                      className="inline-flex items-center gap-1.5 transition hover:text-[#E11D48]"
                    >
                      <Store className="h-3.5 w-3.5 text-zinc-400" />
                      Minhas Vitrines
                    </Link>
                  ) : (
                    <Link
                      to="/entrar"
                      className="inline-flex items-center gap-1.5 transition hover:text-[#E11D48]"
                    >
                      <LogIn className="h-3.5 w-3.5 text-zinc-400" />
                      Entrar
                    </Link>
                  )}
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalDoc('terms')}
                    className="inline-flex items-center gap-1.5 transition hover:text-[#E11D48]"
                  >
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    Termos de Uso
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalDoc('privacy')}
                    className="inline-flex items-center gap-1.5 transition hover:text-[#E11D48]"
                  >
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    Política de Privacidade
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 3 — Suporte e Contato */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
                Precisa de ajuda?
              </h3>
              <p className="text-xs text-zinc-500">Suporte e dúvidas</p>
              <a
                href="mailto:suporte@vitrimini.com.br"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 transition hover:border-rose-300 hover:bg-rose-50/50 hover:text-[#E11D48]"
              >
                <Mail className="h-4 w-4 shrink-0 text-[#E11D48]" />
                <span className="truncate">
                  suporte@vitrimini.com.br
                </span>
              </a>
            </div>
          </div>

          {/* Links Discretos de Soluções por Segmento (SEO Internal Linking) */}
          <div className="mt-8 border-t border-zinc-100 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
              <Link
                to="/"
                className="transition hover:text-[#E11D48] hover:underline"
              >
                VitriMini — Catálogo Online
              </Link>
              {NICHE_LINKS_LIST.map((niche) => (
                <Link
                  key={niche.slug}
                  to={niche.path}
                  className="transition hover:text-[#E11D48] hover:underline"
                >
                  {niche.navLabel}
                </Link>
              ))}
              <Link
                to="/termos"
                className="transition hover:text-[#E11D48] hover:underline"
              >
                Termos de Uso
              </Link>
              <Link
                to="/privacidade"
                className="transition hover:text-[#E11D48] hover:underline"
              >
                Política de Privacidade
              </Link>
            </div>
          </div>

          {/* Barra Inferior — Copyright e Autoria */}
          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row">
            <p>© 2026 VitriMini. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1">
              <span>Desenvolvido por</span>
              <strong className="font-bold text-zinc-800">NeoDevZone</strong>
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Completo de Termos de Uso / Política de Privacidade */}
      {activeDocument && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 shrink-0 text-[#E11D48]" />
                  <h2 className="text-base font-extrabold text-zinc-900 sm:text-lg">
                    {activeDocument.title}
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {activeDocument.subtitle} • Última atualização:{' '}
                  <strong className="font-semibold text-zinc-700">
                    {activeDocument.updatedAt}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLegalDoc(null)}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo do Documento */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-zinc-700">
              {activeDocument.sections.map((sec) => (
                <section key={sec.number} className="space-y-2">
                  <h3 className="text-sm font-extrabold text-zinc-900">
                    {sec.number}. {sec.title}
                  </h3>

                  {sec.paragraphs?.map((p, idx) => (
                    <p key={idx} className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
                      {p}
                    </p>
                  ))}

                  {sec.bullets && (
                    <ul className="space-y-2 pl-4 text-xs leading-relaxed text-zinc-600 sm:text-sm">
                      {sec.bullets.map((b, idx) => (
                        <li key={idx} className="list-disc">
                          {b.boldPrefix && (
                            <strong className="font-bold text-zinc-900">
                              {b.boldPrefix}{' '}
                            </strong>
                          )}
                          <span>{b.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-3.5">
              <span className="text-xs text-zinc-500">
                Dúvidas:{' '}
                <a
                  href="mailto:suporte@vitrimini.com.br"
                  className="font-semibold text-[#E11D48] hover:underline"
                >
                  suporte@vitrimini.com.br
                </a>
              </span>
              <button
                type="button"
                onClick={() => setLegalDoc(null)}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
