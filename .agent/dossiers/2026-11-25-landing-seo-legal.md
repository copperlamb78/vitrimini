# Dossiê da Tarefa: Atualização Landing Page, SEO, Pré-render e Jurídico

- **Data:** 2026-11-25
- **Tamanho:** `M`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Atualizar a Landing Page (`/`), o FAQ (`landingFaq.ts`), as meta tags/Open Graph/JSON-LD (`LandingPage.tsx`, `index.html`, `prerender.mjs`) e os documentos jurídicos (`legalDocs.ts`) para refletir os planos atuais (Essencial R$ 9,90/mês, Pro R$ 14,90/mês, Pro Anual R$ 149,00/ano), ciclo por aniversário de calendário, escolha entre Pix Avulso e Cartão Recorrente, 15 dias grátis sem cartão, VitriLink, pagamento online Mercado Pago e 0% de comissão, mantendo zero alterações no backend.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1 (Componentização da `LandingPage.tsx`):** Manter atualização concentrada em `LandingPage.tsx` reutilizando componentes existentes (`Footer`, `DemoStoreModal`, `Reveal`, mockup atual) sem criar novos arquivos de componente → **Resposta:** `OK, aprovado.`
- **Pergunta 2 (Versão e data de vigência em `legalDocs.ts`):** Versão `2.3` e data de vigência `25 de novembro de 2026` → **Resposta:** `OK, aprovado.`

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Concentrar a atualização nos 5 arquivos mapeados (`LandingPage.tsx`, `landingFaq.ts`, `legalDocs.ts`, `index.html`, `prerender.mjs`), reutilizando `Footer`, `DemoStoreModal`, `Reveal`, `applyPageSeo` e o mockup CSS do Hero (zero novos componentes, zero novos pacotes). Garantir 1 único `<h1>` por página e paridade total entre UI, `index.html` e `prerender.mjs`.
- **Endpoints / Payloads Zod / Tipos TS:** Nenhuma alteração de API/Zod/TS. JSON-LD `SoftwareApplication.offers` migrado para `AggregateOffer` (`lowPrice: "9.90"`, `highPrice: "149.00"`, `priceCurrency: "BRL"`, `offerCount: "3"`) e `FAQPage` sincronizado 1:1 com `LANDING_FAQ_ITEMS`.
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[UX Writing / Zero Jargão]`, `[Interatividade]` (`cursor-pointer` em elementos clicáveis).
- **Fora de escopo:** Zero backend, zero Prisma/migrations, zero novos pacotes npm ou componentes desnecessários.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `N/A` *(Aprovado sem ressalvas — escopo 100% front-end)*
- **Schema & Índices (`@@index`):** `N/A`
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** `N/A`

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:** Zero impacto em backend/Brevo/Render/Supabase; zero novos pacotes ou scripts externos de rastreamento; manter `loading="lazy"` e dimensões explícitas em imagens + HTML estático sincronizado via `prerender.mjs`.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-landing-seo` | `frontend/src/pages/LandingPage.tsx`, `frontend/src/data/landingFaq.ts`, `frontend/index.html`, `frontend/scripts/prerender.mjs` | Atualizados copy da Landing (`/`), planos com Pix Avulso vs. Cartão Recorrente (aniversário no calendário), 15 dias grátis sem cartão, VitriLink, Mercado Pago, agendamento por data/turno, 0% comissão, FAQ, meta tags e JSON-LD (`AggregateOffer` + `FAQPage` 1:1) em `LandingPage.tsx`, `landingFaq.ts`, `index.html` e `prerender.mjs` (incluindo `/termos` e `/privacidade` compatíveis com v2.3). | `Concluído` |
| `dev-legal` | `frontend/src/data/legalDocs.ts` | Atualizados Termos de Uso e Política de Privacidade para Versão 2.3 (vigência 25/11/2026), incluindo planos e valores vigentes, regra de aniversário no calendário, Pix Avulso vs. Cartão Recorrente, 15 dias grátis sem cartão, 7 dias CDC, 0% comissão e delimitação LGPD/sem cartão ou CVV nos servidores. | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/frontend` (`Aprovado` — `cd frontend; npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`) concluído com exit code `0`)
- **Edge cases:**
  - Exatamente `1` `<h1>` confirmado em `frontend/dist/index.html`, `frontend/dist/termos/index.html` e `frontend/dist/privacidade/index.html`.
  - `frontend/dist/index.html` com `<title>`, `description`, `og:title`, `og:description`, `canonical`, `AggregateOffer` (`"lowPrice":"9.90"`, `"highPrice":"149.00"`) e `FAQPage` atualizados.
  - `frontend/dist/termos/index.html` e `frontend/dist/privacidade/index.html` refletem Versão `2.3` e vigência `25 de novembro de 2026`; `/termos` cobre aniversário no calendário, Pix Avulso vs. Cartão Recorrente, 7 dias CDC e 0% comissão; `/privacidade` cobre LGPD e zero armazenamento de cartão/CVV.
  - Zero ocorrências de preços antigos (`24,90`/`24.90`, `39,90`, `99,90`) ou `trimestral` nos 3 HTMLs pré-renderizados.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:**
  - **Seção 6 (`qa`):** Confirmada com build do `/frontend` (`tsc -b && vite build && node scripts/prerender.mjs`, `exit code 0`) e inspeção direta dos HTMLs pré-renderizados (`dist/index.html`, `dist/termos/index.html`, `dist/privacidade/index.html`: exatamente `1` `<h1>` por página, `AggregateOffer`, Versão `2.3` com vigência `25 de novembro de 2026`, zero preços antigos ou `trimestral`).
  - **LGPD & PCI-DSS:** `legalDocs.ts` e `prerender.mjs` explicitam checkout hospedado do Mercado Pago (`init_point`), zero coleta/armazenamento de número de cartão ou CVV, sem certificação PCI-DSS própria e sem tabela de logs históricos de IP + data/hora no banco.
  - **Zero rastreamento externo:** `index.html`, `LandingPage.tsx` e HTMLs pré-renderizados sem scripts externos de analytics, pixels ou trackers de terceiros.
  - **UI, Responsividade & `cursor-pointer`:** Todos os botões, links (`<Link>`, `<a>`) e acordeões de FAQ em `LandingPage.tsx` possuem `cursor-pointer` e grid responsivo (`grid-cols-1` até `lg:grid-cols-3`/`4`/`12`).
  - **UX Writing (Zero Jargão):** `LandingPage.tsx` e `landingFaq.ts` usam linguagem natural para lojistas e compradores (sem *login*, *logado*, *slug*, *token*, *upload* ou *MIME*).
  - **Escopo / Zero novos componentes:** Confirmado via `git status` que nenhum novo arquivo de componente foi criado (`Footer`, `DemoStoreModal`, `Reveal` e mockup CSS reutilizados).
- **Veredito:** `APROVADO`

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o servidor de desenvolvimento do front-end (`cd frontend; npm run dev`) ou sirva o build estático (`cd frontend; npm run preview`).
2. Acesse `/` e verifique: Hero com `15 dias grátis sem cartão na 1ª vitrine • 0% de comissão`, VitriLink, Mercado Pago, os 3 planos (`Essencial R$ 9,90/mês`, `Pro R$ 14,90/mês`, `Pro Anual R$ 149,00/ano`), escolha entre Pix Avulso e Cartão Recorrente por aniversário no calendário, FAQ acordeão e links do rodapé.
3. Acesse `/termos` e `/privacidade` e confirme a exibição da `Versão 2.3` (`25 de novembro de 2026`), regras de Pix Avulso vs. Cartão Recorrente, 7 dias CDC e delimitação LGPD/PCI-DSS.
4. *(Opcional)* No código-fonte dos HTMLs em `frontend/dist/`, confirme `AggregateOffer`, `FAQPage` e `<h1>` único em `/`, `/termos` e `/privacidade`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A` *(promovida para `.agent/memory/lessons-learned.md`? `N/A`)*
