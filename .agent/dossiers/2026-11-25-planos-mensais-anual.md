# Dossiê da Tarefa: Planos Mensais (30d) e Pro Anual (365d)

- **Data:** 2026-11-25
- **Tamanho:** `M`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Substituir os planos trimestrais (90 dias) pelos novos planos mensais (`ESSENTIAL_30` por R$ 9,90 e `PRO_30` por R$ 14,90) e `PRO_365` (Pro Anual por R$ 149,00 — "2 meses grátis") no backend (Pix, Mercado Pago `/preapproval`, webhooks e validação) e no frontend (`LandingPage`, `PlanSelectorModal`, `ManagePage`, `MyCatalogsPage`, `PixPaymentModal`, `legalDocs`, `landingFaq`, `nichePages` e `prerender.mjs`), mantendo retrocompatibilidade com códigos legados (`ESSENTIAL_90D`/`PRO_90D`/`ESSENTIAL_90`/`PRO_90`) sem alterar o `schema.prisma`.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1 (Fallback de códigos legados `ESSENTIAL_90D` / `PRO_90D`):** Mapear para `ESSENTIAL_30` e `PRO_30` em `resolvePlanDefinition` → **Resposta:** `OK, aprovado.`
- **Pergunta 2 (E-mails transacionais `email.service.ts`):** Atualizar textos de expiração/renovação removendo `90 dias` e `R$ 24,90` → **Resposta:** `OK, aprovado.`

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:**
  - Substituir os planos de 90d pelos 3 planos canônicos em `PLAN_CATALOG` (`payment.service.ts`) e `VITRIMINI_PLANS` (`PlanSelectorModal.tsx`), sem criar tabela de planos nem alterar `schema.prisma`:
    - `ESSENTIAL_30`: `planType: 'ESSENTIAL'`, `days: 30`, `months: 1`, `amountCents: 990` (R$ 9,90).
    - `PRO_30`: `planType: 'PRO'`, `days: 30`, `months: 1`, `amountCents: 1490` (R$ 14,90).
    - `PRO_365`: `planType: 'PRO'`, `days: 365`, `months: 12`, `amountCents: 14900` (R$ 149,00 — "2 meses grátis").
  - Retrocompatibilidade em `resolvePlanDefinition(rawCode)` via mapa de aliases (`LEGACY_PLAN_MAP`): `ESSENTIAL_90D` / `ESSENTIAL_90` → `ESSENTIAL_30`; `PRO_90D` / `PRO_90` → `PRO_30`; `PRO_365D` → `PRO_365`. Fallback padrão com `DEFAULT_AMOUNT_CENTS = 990` e `THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000` em `catalog.service.ts`.
- **Endpoints / Payloads Zod / Tipos TS:**
  - **Rotas Express:** Nenhuma rota nova necessária; rotas existentes de Pix, Preapproval e Webhook permanecem inalteradas.
  - **Backend (`backend/src/services/payment.service.ts`):** `PlanCode = 'ESSENTIAL_30' | 'PRO_30' | 'PRO_365'`, `LegacyPlanCode` para fallback, `PlanDefinition.months: 1 | 12` e `auto_recurring.frequency = planDef.months` (`1` ou `12`) com `frequency_type: 'months'`.
  - **Zod (`backend/src/utils/validation.ts`):** `createCardSubscriptionSchema.planCode` aceitando novos códigos + legados com normalização em `resolvePlanDefinition`.
  - **Frontend (`frontend/src/types/catalog.ts` & `PlanSelectorModal.tsx`):** `CatalogPlanCode = 'ESSENTIAL_30' | 'PRO_30' | 'PRO_365'`, `initialPlan = 'PRO_30'` e `cycleDescription` para `30 dias (mensal)` ou `12 meses (anual)`.
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[UX Writing / Zero Jargão]`, `[Tema Dinâmico]`, `[Interatividade]`.
- **Fora de escopo:** Alterações em `schema.prisma`, migração forçada de assinaturas legadas já ativas no MP, cupons ou novos gateways.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Schema & Índices (`@@index`):** Zero alterações em `backend/prisma/schema.prisma` e zero migrations, mantendo isolamento em `vitrimini-dev`. `CatalogPayment.planCode` é `String` livre retrocompatível com `ESSENTIAL_90D`, `PRO_90D`, `ESSENTIAL_90` e `PRO_90`.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** Confirmações em `$transaction` com `@@unique([gatewayId])` e tratamento de `P2002` garantem idempotência.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Com ressalvas`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:** Parametrizar `backend/src/services/email.service.ts` (remover hardcode `90 dias` e `R$ 24,90`) e manter deduplicação de e-mails de renovação/expiração para proteger a cota diária de 300/dia com o ciclo mensal. Zero impacto em Render/Supabase/Cloudflare (sem novos pacotes ou componentes).

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend` | `backend/src/services/payment.service.ts`, `backend/src/services/catalog.service.ts`, `backend/src/services/email.service.ts`, `backend/src/utils/validation.ts` | `PLAN_CATALOG` atualizado (`ESSENTIAL_30` 990, `PRO_30` 1490, `PRO_365` 14900), `LEGACY_PLAN_MAP` + fallback `990`, `frequency: planDef.months` no MP, `THIRTY_DAYS_MS` e `resolvePlanFromSubscriptionWebhook` em `catalog.service.ts`, enum legado+canônico em `validation.ts`, e e-mails de `email.service.ts` atualizados sem `90 dias`/`R$ 24,90`. | `Concluído` |
| `dev-frontend` | `frontend/src/types/catalog.ts`, `frontend/src/services/api.ts`, `frontend/src/components/PlanSelectorModal.tsx`, `frontend/src/components/PixPaymentModal.tsx`, `frontend/src/components/BioLinksTab.tsx`, `frontend/src/pages/LandingPage.tsx`, `frontend/src/pages/ManagePage.tsx`, `frontend/src/pages/MyCatalogsPage.tsx`, `frontend/src/data/legalDocs.ts`, `frontend/src/data/landingFaq.ts`, `frontend/src/data/nichePages.ts`, `frontend/scripts/prerender.mjs`, `frontend/index.html` | `CatalogPlanCode` atualizado para `'ESSENTIAL_30' \| 'PRO_30' \| 'PRO_365'`; `VITRIMINI_PLANS` e `cycleDescription` atualizados em `PlanSelectorModal.tsx`; defaults de `PixPaymentModal.tsx` (`R$ 9,90`, `30` dias); seção de 3 planos na `LandingPage.tsx`; referências de UI, FAQ, SEO (`index.html`, `prerender.mjs`), nichos e Termos de Uso atualizadas removendo `90 dias`/trimestral/`24,90`/`39,90`/`99,90`; `npx tsc --noEmit` passou. | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/backend` (`Passou — exit code 0` via `prisma generate && tsc`) | `/frontend` (`Passou — exit code 0` via `tsc -b && vite build && node scripts/prerender.mjs`, 7 rotas pré-renderizadas) | `prisma generate` (`Passou — v6.19.3`)
- **Varredura de referências antigas (`24,90|24\.90|39,90|39\.90|99,90|99\.90|90 dias|trimestral|trimestrais`):**
  - Zero ocorrências de `39,90`, `39.90`, `99,90`, `99.90`, `90 dias`, `trimestral`, `trimestrais` em `backend/src`, `frontend/src`, `frontend/scripts` e `frontend/index.html`.
  - `frontend/src/pages/LandingPage.tsx:574` mantém `R$ 224,90` (mockup de pedido, esperado).
  - **Resíduo encontrado (JSON-LD `SoftwareApplication.offers.price`):** `frontend/src/pages/LandingPage.tsx:265` (`price: '24.90'`) e `frontend/scripts/prerender.mjs:493` (`price: '24.90'`, propagado para `frontend/dist/**/index.html:54`).
- **Edge cases & Retrocompatibilidade:**
  - `LEGACY_PLAN_MAP` (`backend/src/services/payment.service.ts:49-55`) e `resolvePlanDefinition` (`lines 57-70`) mapeiam `ESSENTIAL_90D`/`ESSENTIAL_90` → `ESSENTIAL_30`, `PRO_90D`/`PRO_90` → `PRO_30` e `PRO_365D` → `PRO_365`, com fallback `DEFAULT_AMOUNT_CENTS = 990`.
  - `createCardSubscriptionSchema` (`backend/src/utils/validation.ts:358-372`) valida os 3 códigos canônicos + 5 legados e exige `autoRenewConsent: true`.
  - `PlanSelectorModal.tsx` (`VITRIMINI_PLANS`, `initialPlan = 'PRO_30'`, `cycleDescription`), `PixPaymentModal.tsx` (defaults `R$ 9,90` e `30` dias) e `LandingPage.tsx` (cards `9,90`, `14,90`, `149,00` nas linhas 889, 933 e 977) consistentes com os novos planos.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:**
  - **Seção 6 (`qa`) & Varredura:** Builds `/backend` e `/frontend` aprovados com exit code `0`; resíduo `24.90` no JSON-LD (`LandingPage.tsx:265` e `prerender.mjs:493`) corrigido para `9.90`; varredura `Select-String` confirmou `0` ocorrências residuais de valores/prazos antigos (exceto mockup `R$ 224,90`).
  - **Auth / Ownership / IDOR:** Rotas do lojista protegidas por `requireMerchant` (`catalog.routes.ts`); posse validada no banco com `userId` (`findOwnedCatalogById`, `updateOwnedCatalogPaymentId`).
  - **LGPD:** `mpUserId` sanitizado para `mpConnected: Boolean(...)` nos retornos do painel; nenhum dado pessoal exposto em rotas públicas.
  - **Zod & Contratos:** `createCardSubscriptionSchema` (`backend/src/utils/validation.ts:358-372`) valida os 3 códigos canônicos + 5 legados e exige `autoRenewConsent: true`; `payment.service.ts` envia `frequency: planDef.months` (`1` ou `12`) com `frequency_type: 'months'`.
  - **`safeRedirect`:** Redirecionamento para `res.initPoint` protegido por `safeRedirect` em `ManagePage.tsx` e `MyCatalogsPage.tsx`.
  - **Decreto nº 7.962/2013 & UX (`PlanSelectorModal.tsx`):** Resumo explícito de valor e periodicidade (`cycleDescription`), aviso de cancelamento sem multa, checkbox obrigatório `autoRenewConsent`, tema dinâmico (`accentColor`/`accentTextColor`) e `cursor-pointer` em todos os controles interativos.
  - **Escopo de arquivos:** Nenhum novo arquivo de componente criado (`git status --short`).
- **Veredito:** `APROVADO`

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Subir backend e frontend localmente (apontando para o banco `vitrimini-dev` configurado no `.env` local).
2. Acessar a Landing Page (`/`) e conferir os 3 planos exibidos (`Essencial Mensal` R$ 9,90, `Pro Mensal` R$ 14,90 e `Pro Anual` R$ 149,00 — "2 meses grátis") e o JSON-LD com `price: "9.90"`.
3. Entrar no painel do lojista (`ManagePage` / `MyCatalogsPage`), abrir o modal de planos (`PlanSelectorModal`) e validar:
   - Seleção dos 3 planos com destaque na cor do tema da vitrine e `cursor-pointer`.
   - Pagamento via **Pix** exibindo R$ 9,90 / R$ 14,90 / R$ 149,00 com prazo de 30 ou 365 dias.
   - Pagamento via **Cartão de Crédito** exibindo o quadro do Decreto nº 7.962/2013 (`a cada 30 dias (mensal)` ou `a cada 12 meses (anual)`) e bloqueando o envio até marcar o aceite `autoRenewConsent`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Sim (ajuste pontual no JSON-LD de 24.90 para 9.90 apontado pelo QA em LandingPage.tsx e prerender.mjs)`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A — caso específico já coberto pela etapa de varredura do QA.` *(promovida para `.agent/memory/lessons-learned.md`? `Não`)*
