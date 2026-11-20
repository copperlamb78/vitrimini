# Dossiê da Tarefa: Crescimento & Divulgação (OG Dinâmico + Kit QR Code + Selo Orgânico)

- **Data:** 2026-11-20
- **Tamanho:** `M`
- **Status Atual:** `Concluído`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Melhorar a divulgação e o crescimento orgânico das vitrines em 3 frentes: (1) atualizar a Cloudflare Pages Function `frontend/functions/c/[slug].ts` com validação estrita, timeout de 2,5s e `HTMLRewriter` nativo para previews dinâmicos no WhatsApp/Instagram; (2) adicionar o modal lazy-loaded **"Divulgar minha vitrine"** com QR Code baixável em PNG (1024x1024), botão de copiar link e atalho de WhatsApp no painel do lojista; (3) atualizar o selo discreto de rodapé na vitrine pública para apontar com `?ref=vitrine` sem competir com a marca da loja.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **1-B:** Botão **"Divulgar"** no cabeçalho de `ManagePage.tsx` e **"Divulgar / QR Code"** nos cards de vitrines ativas em `MyCatalogsPage.tsx`, reutilizando `ShareCatalogModal` via `React.lazy`.
- **2-A:** Em `functions/c/[slug].ts`, usar `logoUrl` apenas se começar com `https://`; caso contrário manter `https://vitrimini.com.br/og-cover.png` (`1200x630`).
- **3-A:** PNG `1024x1024` com cartão branco limpo, QR Code escuro centralizado, nome da vitrine abaixo (com ajuste de fonte/truncamento via `ctx.measureText` para nunca cortar nas bordas) e *"Aponte a câmera para fazer seu pedido"*.

---

## 2. Arquitetura & Contratos *(Dono: `principal-engineer`)*
- **Decisão KISS:** Sem mudanças de backend/API ou `schema.prisma`; reutiliza `GET /api/store/:slug`.
- **Frente 1 (`frontend/functions/c/[slug].ts`):**
  - Validar `slug` (`^[a-z0-9-]+$`, máx. 120) e `CRAWLER_UA_REGEX` logo na entrada; humanos vão direto para `context.next()`.
  - `fetch(..., { signal: AbortSignal.timeout(2500) })`; fallback transparente para `context.next()`.
  - `HTMLRewriter` sobre `const baseRes = await context.next()` substituindo `<title>`, `meta[name="description"]`, `og:*`, `twitter:*` e `link[rel="canonical"]` (sem duplo escaping), mantendo `og-cover.png` se não houver `logoUrl` HTTPS, e aplicando `Cache-Control: public, max-age=300` apenas para crawlers.
- **Frente 2 (`ManagePage.tsx` + `ShareCatalogModal.tsx`):**
  - `ShareCatalogModal` carregado via `React.lazy` (isolado do bundle de `StorePage`).
  - Lib `qrcode` gerando PNG `1024x1024` em `<canvas>` com *quiet zone* branca, nome da vitrine abaixo, botão **"Baixar QR Code (PNG)"**, **"Copiar link da vitrine"** (*"Link copiado!"*) e **"Compartilhar no WhatsApp"**.
  - Tema dinâmico da vitrine, `cursor-pointer` e UX Writing zero jargão.
- **Frente 3 (`StorePage.tsx`):**
  - Atualizar selo de rodapé para `<a href="https://vitrimini.com.br/?ref=vitrine" target="_blank" rel="noopener noreferrer" ...>` com `cursor-pointer` e espaço inferior (`pb-28`) respeitando a barra do carrinho.
- **Memória (`lessons-learned.md`):** Aplicadas `[Tema Dinâmico]`, `[Interatividade]` e `[UX Writing / Zero Jargão]`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Impacto:** Zero alterações em `schema.prisma`, zero novas queries ou N+1 (reutiliza `GET /api/store/:slug` com `@unique` em `Catalog.slug` e cache de borda de `300s`).

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Impacto:**
  - Cloudflare Edge + Render/Supabase protegidos por filtro de `User-Agent` (só crawlers), `AbortSignal.timeout(2500)` e `Cache-Control: public, max-age=300`.
  - Lib `qrcode` isolada via `React.lazy` fora do bundle público da vitrine; geração 100% no cliente (zero CPU de servidor e zero armazenamento extra no R2).
  - Brevo intacta (zero e-mails novos).

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-frontend` | `frontend/functions/c/[slug].ts`, `frontend/package.json`, `frontend/src/components/ShareCatalogModal.tsx`, `frontend/src/pages/ManagePage.tsx`, `frontend/src/pages/MyCatalogsPage.tsx`, `frontend/src/pages/StorePage.tsx` | Atualizado `functions/c/[slug].ts` com regex `^[a-z0-9-]{1,120}$`, `AbortSignal.timeout(2500)`, `HTMLRewriter` sobre `context.next()` (meta/OG/Twitter/JSON-LD com `\u003c`), `og:image` `https://` com fallback `og-cover.png` (`1200x630`), `Cache-Control: public, max-age=300` + `Vary: User-Agent`. Criado `ShareCatalogModal.tsx` (`React.lazy`, `qrcode` 1024×1024 PNG com ajuste de fonte `fitCanvasText`, copiar link e compartilhar no WhatsApp) integrado em `ManagePage.tsx` e `MyCatalogsPage.tsx`. Selo `?ref=vitrine` atualizado em `StorePage.tsx`. | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/frontend` (`Passou — tsc -b && vite build exit 0`, `ShareCatalogModal` isolado em chunk lazy `30.57 kB`, `StorePage` intacta em `22.73 kB`) | Type-check de `functions/c/[slug].ts` (`Passou — tsc --noEmit exit 0`)
- **Edge cases:** Fallback para `context.next()` quando crawler falha ou dá timeout (2,5s); `og:image` só aceita `logoUrl` se iniciar com `https://`; nomes longos no PNG 1024×1024 ajustam fonte e truncam com `ctx.measureText`; `navigator.clipboard.writeText` protegido por `try/catch`; zero jargão técnico e `cursor-pointer` em todos os botões/links.
- **Apontamentos (se houver):**
  - _Ciclo 1:_ Corrigido `theme.primaryBgHover` → `theme.primaryHover` em `ShareCatalogModal.tsx`; rebuild validado com exit 0.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:**
  - `functions/c/[slug].ts`: regex `^[a-z0-9-]{1,120}$` antes do fetch, `CRAWLER_UA_REGEX` evitando carga no backend para humanos, `AbortSignal.timeout(2500)`, `HTMLRewriter` sem duplo escaping, JSON-LD escapado (`\u003c`), `og:image` estritamente `https://` com fallback `og-cover.png`, `Cache-Control: public, max-age=300` + `Vary: User-Agent`.
  - `ShareCatalogModal.tsx`: carregado via `React.lazy` em `ManagePage.tsx` e `MyCatalogsPage.tsx` (zero impacto em `StorePage.tsx`), PNG `1024x1024` com quiet zone e `fitCanvasText`, tema dinâmico, `cursor-pointer` e UX Writing zero jargão.
  - `StorePage.tsx`: selo de rodapé atualizado para `https://vitrimini.com.br/?ref=vitrine` com `target="_blank"`, `rel="noopener noreferrer"` e `cursor-pointer`.
- **Veredito:** `APROVADO`
- **Apontamentos (se houver):**
  - _Ciclo 1:_ Nenhum bloqueio.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. **Kit de Divulgação (`ManagePage` e `MyCatalogsPage`):** Entrar em `/minhas-vitrines` (botão **"Divulgar / QR Code"** em vitrines ativas) ou `/painel/:id` (botão **"Divulgar"** no cabeçalho), abrir o modal, testar **"Copiar link da vitrine"** (*"Link copiado!"*), **"Compartilhar no WhatsApp"** e **"Baixar QR Code (PNG)"** (conferindo a imagem `1024x1024` gerada com o nome da vitrine e quiet zone).
2. **Selo no Rodapé (`StorePage`):** Abrir `/c/:slug`, rolar até o final (com e sem itens no carrinho) e confirmar que o selo *"Vitrine criada com VitriMini — Crie a sua em 2 minutos"* abre `https://vitrimini.com.br/?ref=vitrine` em nova aba sem sobrepor a barra do carrinho.
3. **OG Tags Dinâmicas (`functions/c/[slug].ts`):** Após publicar no Cloudflare Pages (ou via `npx wrangler pages dev dist`), testar `curl -A "WhatsApp/2.23" https://vitrimini.com.br/c/<slug>` para validar `<title>`, `og:title`, `og:description`, `og:image` e `Cache-Control: public, max-age=300`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** _N/A_
