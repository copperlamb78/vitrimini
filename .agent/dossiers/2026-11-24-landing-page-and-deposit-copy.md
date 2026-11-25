# Dossiê da Tarefa: Atualização da Landing Page & Nomenclatura de Pagamento Antecipado

- **Data:** 2026-11-24
- **Tamanho:** `M` (Frontend UI/UX & Copywriting — sem alteração de banco/API)
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Atualizar a Landing Page da VitriMini (remover "Saiba mais ->" dos cards de nicho, concentrar preços apenas na seção de Planos, substituir a comparação antiga por destaque ao Painel de Gestão + WhatsApp, adicionar seção de 5 Funcionalidades e atualizar os planos Essencial e Pro com VitriLink e Mercado Pago) e eliminar o termo "sinal" em toda a interface da Landing Page, customização da Vitrine (`ManagePage.tsx`) e checkout/resumo (`StorePage.tsx` e previews), mantendo contratos de API/banco 100% intactos.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Especificação completa fornecida pelo usuário na solicitação (itens A a F).

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Zero quebra de contrato:** `depositPct` (`0 | 50 | 100`) permanece inalterado no Prisma/API/Zod/TS; apenas rótulos visuais, copys e mensagens de WhatsApp/checkout substituem `"sinal"` por `"pagamento no pedido"` / `"valor antecipado"`.
- **Modularidade & Responsividade (`360px`+):** `LandingPage.tsx` usa constantes tipadas e grids mobile-first (`grid-cols-1`, `min-w-0`, `lg:grid-cols-3`, `md:grid-cols-2`) com Tailwind CSS v4 e `lucide-react`.
- **Fora de escopo:** Alterações em `backend/`, rotas Express ou `schema.prisma`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado` (`N/A` para alterações de banco — zero migrations, coluna `depositPct` preservada intacta).

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado` — zero novos pacotes, reuso exclusivo de `lucide-react` e assets existentes.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-landing` | `frontend/src/pages/LandingPage.tsx`, `frontend/src/components/DemoStoreModal.tsx`, `frontend/src/data/landingFaq.ts` | Removidos `"Saiba mais ->"`, `"sinal"` e `24,90` fora dos Planos; nova seção Painel de Gestão + WhatsApp, seção `#funcionalidades` (5 itens) e Planos Essencial/Pro atualizados | `Concluído` |
| `dev-vitrine-copy` | `frontend/src/pages/ManagePage.tsx`, `frontend/src/pages/StorePage.tsx`, `frontend/src/pages/CreatorPage.tsx`, `frontend/src/pages/MyCatalogsPage.tsx`, `frontend/src/components/CatalogLivePreview.tsx`, `frontend/src/components/PhoneMockupPreview.tsx` | Rótulo *"Cobrança no Pedido (Pagamento Antecipado)"* com opções 0%/50%/100%, checkout/WhatsApp e empty state sem `"sinal"`, mantendo `depositPct` intacto | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Build Frontend (`frontend/`):** `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`) — **Exit code `0`** (`✓ built in 7.58s`, 7 rotas pré-renderizadas em `dist/`).
- **Varredura `"sinal"` (case-insensitive):** `0` ocorrências em `LandingPage.tsx`, `DemoStoreModal.tsx`, `ManagePage.tsx`, `StorePage.tsx`, `CreatorPage.tsx`, `MyCatalogsPage.tsx` e `landingFaq.ts`.
- **Varredura `"24,90"` em `LandingPage.tsx`:** Ocorre na seção de Planos (linha 889, Plano Essencial `24,90`) e apenas como substring de `R$ 224,90` (total do pedido no mockup de WhatsApp, linha 574) — nenhum preço de plano fora da seção de Planos.
- **Responsividade `360px` & `cursor-pointer`:**
  - Seção Painel de Gestão + WhatsApp (`LandingPage.tsx:591-677`): `px-4`, `grid-cols-1 lg:grid-cols-2`, cards e textos com `min-w-0` e ícones `shrink-0` (sem overflow horizontal).
  - Seção `#funcionalidades` (`LandingPage.tsx:725-762`): `px-4`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, cards com `min-w-0` (sem overflow horizontal).
  - `cursor-pointer` confirmado nos links/botões da navbar, CTAs do hero, botões dos planos, accordion do FAQ e CTA final.
- **Veredito QA:** `APROVADO`

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Contrato & Escopo:** `depositPct` (`0 | 50 | 100`) preservado integralmente em `ManagePage.tsx`, `StorePage.tsx` e `CreatorPage.tsx`; zero alterações em `backend/`, rotas Express ou `schema.prisma`.
- **Design System & `lessons-learned.md`:** `cursor-pointer` aplicado em todos os botões/links/seletores modificados; tema dinâmico respeitado (`resolvedStoreTheme.primaryColor` em `ManagePage.tsx` e `activeTheme` em `CreatorPage.tsx`); zero jargão técnico e zero ocorrências de `"sinal"` nos 7 arquivos auditados.
- **Aderência aos itens A–F:** Cards de nicho sem `"Saiba mais ->"`, preços concentrados apenas na seção de Planos, seção Painel de Gestão + WhatsApp, seção `#funcionalidades` (5 pilares), planos Essencial/Pro atualizados (VitriLink + Mercado Pago) e nomenclatura de pagamento antecipado aplicada em vitrine/painel/checkout.
- **Veredito Final:** `APROVADO`

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o frontend (`cd frontend && npm run dev`) e acesse `/` em `360px` e desktop.
2. Confirme: Hero sem `R$ 24,90` e sem `"sinal"`, seção nova **Painel de Gestão + WhatsApp**, seção **Funcionalidades** (5 itens), **Para quem é a VitriMini** sem `"Saiba mais ->"`, e **Planos** com `Essencial` e `Plano Pro` (VitriLink + Mercado Pago).
3. Em `/gerenciar` e `/criar`, confirme **"Cobrança no Pedido (Pagamento Antecipado)"** com `0% do valor`, `50% do valor` e `100% do valor`.
4. Na vitrine pública `/:slug`, teste finalizar pedido e confirme **"Valor antecipado"** no resumo e **"Pagamento no pedido"** na mensagem do WhatsApp.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
