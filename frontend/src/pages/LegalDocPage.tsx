import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { LEGAL_DOCS } from '../data/legalDocs';
import { applyPageSeo } from '../utils/seo';
import logoVitriMini from '../assets/logo-vitrimini.png';

interface LegalDocPageProps {
  type: 'terms' | 'privacy';
}

export function LegalDocPage({ type }: LegalDocPageProps) {
  const doc = LEGAL_DOCS[type];

  useEffect(() => {
    applyPageSeo({
      title: `${doc.title}`,
      description: doc.subtitle,
      canonicalPath: type === 'terms' ? '/termos' : '/privacidade',
    });
  }, [doc.title, doc.subtitle, type]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoVitriMini}
              alt="Logo da VitriMini"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link
              to={type === 'terms' ? '/privacidade' : '/termos'}
              className="cursor-pointer text-zinc-600 hover:text-zinc-900"
            >
              {type === 'terms' ? 'Política de Privacidade' : 'Termos de Uso'}
            </Link>
            <Link
              to="/"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Início
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-3xl px-4">
        <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Atualizado em {doc.updatedAt}
          </div>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
            {doc.title}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">{doc.subtitle}</p>

          <div className="mt-8 space-y-6 border-t border-zinc-100 pt-6">
            {doc.sections.map((section) => (
              <section key={section.number} className="space-y-2.5">
                <h2 className="text-base font-extrabold text-zinc-900">
                  {section.number}. {section.title}
                </h2>
                {section.paragraphs?.map((p, idx) => (
                  <p
                    key={idx}
                    className="text-sm leading-relaxed text-zinc-600"
                  >
                    {p}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600">
                    {section.bullets.map((b, idx) => (
                      <li key={idx}>
                        {b.boldPrefix && (
                          <strong className="font-bold text-zinc-800">
                            {b.boldPrefix}{' '}
                          </strong>
                        )}
                        {b.text}
                      </li>
                    ))}
                  </ul>
                )}
                {section.table && (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200">
                    <table className="w-full min-w-[520px] border-collapse text-left text-xs sm:text-sm">
                      <thead className="bg-zinc-50">
                        <tr>
                          {section.table.headers.map((header, idx) => (
                            <th
                              key={idx}
                              scope="col"
                              className="border-b border-zinc-200 px-4 py-2.5 font-bold text-zinc-800"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white">
                        {section.table.rows.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <td
                                key={cellIdx}
                                className={`px-4 py-3 align-top leading-relaxed text-zinc-600 ${
                                  cellIdx === 0 ? 'font-semibold text-zinc-800' : ''
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}
