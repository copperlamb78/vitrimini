# Dossiê da Tarefa: Evolução da Landing Page (Conversão, CSS & SEO)

- **Data:** 2026-11-20
- **Tamanho:** `M`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Evoluir a `LandingPage.tsx`, `index.css` e `index.html` para aumentar a conversão de lojistas (novo Hero com mockup animado + notificação de pedido, seção "Para quem é" por nicho, diferenciais reais incluindo acompanhamento em tempo real e painel financeiro, FAQ expandido e CTA final) com animações 100% em CSS (GPU, `prefers-reduced-motion`) e SEO técnico/On-Page completo (`<main>`, `FAQPage`, `Organization`, `SoftwareApplication`, `theme-color`).

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **P1 (H1 Hero):** `A` → *"Catálogo Online e Vitrine Digital com Pedidos no WhatsApp"* (subtítulo mantendo dor do PDF + R$ 24,90/90 dias).
- **P2 (Antes x Depois):** `A` → manter *"Antes x Depois"* compacto + adicionar *Como Funciona*, *Diferenciais*, *Para quem é (Nichos)*, *Valor*, *FAQ* (6 perguntas) e *CTA Final*.
- **P3 (JSON-LD):** `A` → `Organization` + `SoftwareApplication` + `FAQPage` no `index.html` com `id="vitrimini-jsonld"` (para `applyPageSeo` substituir/remover em `/c/:slug` e `/pedido/:trackingCode`).
- **Cuidado LCP:** Hero visível imediatamente no primeiro carregamento (sem `IntersectionObserver` bloqueando o paint inicial); `Reveal` apenas abaixo da dobra.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Manter zero dependências externas de animação. Centralizar `@keyframes` (`float`, `pulse-dot`, `reveal`, `prefers-reduced-motion`) em `frontend/src/index.css`; criar helper/componente `Reveal` limpo com `IntersectionObserver` + FAQ accordion animado com `grid-rows-[0fr/1fr]`. Sincronizar `FAQ_ITEMS` entre `LandingPage.tsx` e JSON-LD `FAQPage` (via `applyPageSeo` + `index.html` estático para crawlers).
- **Estrutura semântica:** `<header>` → `<main>` (`Hero` com único `<h1>`, `Antes x Depois`, `Como Funciona`, `Diferenciais`, `Para quem é / Nichos`, `Valor`, `FAQ`, `CTA Final`) → `<Footer />`.
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[Interatividade]` (`cursor-pointer` preservado em todos os botões/cards/FAQ); `[Polling + Skeleton]` (N/A na Landing, rota `/` sem chamada bloqueante de API para texto principal).
- **Fora de escopo:** Alterações de backend/banco, alteração de preços reais (mantido R$ 24,90 único por 90 dias, 0% comissão) ou criação de novas rotas.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `N/A`
- **Schema & Índices (`@@index`):** Nenhuma alteração de banco de dados.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Brevo / Render / Supabase / Cloudflare / Polling:** Zero impacto em cotas ou bundle (animações 100% CSS sem libs externas; `index.html` e `LandingPage.tsx` sem chamadas extras de API).

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-frontend` | `frontend/index.html`, `frontend/src/index.css`, `frontend/src/pages/LandingPage.tsx`, `frontend/src/data/landingFaq.ts` | SEO técnico + JSON-LD `vitrimini-jsonld`, `@keyframes` GPU + `prefers-reduced-motion`, Hero LCP imediato + mockup animado, Nichos, Diferenciais, FAQ accordion CSS e CTA final | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/frontend` (`npm --prefix frontend run build` → `tsc -b && vite build`): **exit code 0** (`5.31s`). `/backend`: `N/A` (sem alterações no backend).
- **Edge cases & Performance:**
  - Hero visível imediatamente no primeiro paint (sem `Reveal` / `opacity-0` bloqueando LCP); `fetchPriority="high"` na logo.
  - Animações 100% CSS (`vm-float`, `vm-pulse-dot`, `vm-hero-enter`, FAQ `grid-rows-[0fr/1fr]`) usando apenas `transform`/`opacity` e respeitando `@media (prefers-reduced-motion: reduce)`.
  - `id="vitrimini-jsonld"` no `index.html` permite que `applyPageSeo` remova/substitua o JSON-LD nas rotas `/c/:slug` e `/pedido/:trackingCode`.
  - Mobile & Design System: paleta `#E11D48` / `#18181B` e `cursor-pointer` preservados.
- **Veredito QA:** `APROVADO`

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:** Auth/ownership (`N/A` — página pública) | LGPD (`OK` — zero dados reais, apenas exemplo fictício no mockup) | SEO & Semântica (`OK` — `<main>`, único `<h1>`, `<h2>`/`<h3>` hierárquicos, `Organization` + `SoftwareApplication` + `FAQPage` 100% sincronizado com `LANDING_FAQ_ITEMS`) | Design System & `cursor-pointer` (`OK` — zero libs externas, zero preços/recursos inventados).
- **Veredito:** `APROVADO`

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o `/frontend` (`npm run dev`) e acesse `http://localhost:5173/`.
2. Confirme que o Hero aparece instantaneamente (sem fade-in bloqueante) com o mockup flutuando (`vm-float`) e o ponto verde pulsando no badge *"Novo pedido recebido"*.
3. Role a página para validar o reveal suave das seções (*Antes x Depois*, *Como Funciona*, *Diferenciais*, *Nichos*, *Valor*, *FAQ* e *CTA Final*) e clique nas perguntas do FAQ para testar a abertura suave.
4. No DevTools, inspecione `<script id="vitrimini-jsonld">` na Home e navegue para uma vitrine (`/c/<slug>`) para confirmar que o schema da Home não vaza.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não` (cuidados preventivos de LCP e `id="vitrimini-jsonld"` aplicados antes da implementação).
- **Lição candidata:** `N/A`
