# Dossiê da Tarefa: Assinatura Recorrente via Cartão de Crédito (Mercado Pago Preapproval)

- **Data:** 2026-11-25
- **Tamanho:** `G`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Adicionar opção de assinatura recorrente via Cartão de Crédito (Mercado Pago `/preapproval` com `init_point`, zero dados de cartão no servidor) nos planos Essencial e Pro (90 dias / 1 ano), mantendo intactos o teste grátis de 15 dias sem cartão e o Pix Avulso. Inclui cancelamento automático da assinatura anterior em upgrades/trocas para evitar cobrança dupla, cancelamento direto no painel (`ManagePage.tsx`), idempotência nos webhooks e atualização jurídica em `legalDocs.ts`.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Fluxo de checkout cartão:** Redirect seguro para checkout hospedado do Mercado Pago (`init_point`) — zero dados de cartão no servidor.
- **Cancelamento de assinatura anterior:** Cancelar automaticamente a assinatura anterior no Mercado Pago ao confirmar o novo pagamento (upgrade ou troca para Pix avulso).
- **Periodicidade Mercado Pago:** 3 meses (`frequency: 3, frequency_type: 'months'`) para Essencial/Pro 90 dias e 12 meses (`frequency: 12, frequency_type: 'months'`) para Pro 365 dias.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **KISS & PCI-DSS (SAQ-A):** `fetch` nativo em `payment.service.ts` para `POST/GET/PUT https://api.mercadopago.com/preapproval` (`init_point` hospedado do Mercado Pago; zero PAN/CVV no servidor).
- **Endpoints & Webhook:**
  - `POST /api/catalogs/:id/subscription/card` (`requireMerchant`, Zod `planCode` + `autoRenewConsent: true`) → retorna `{ initPoint, preapprovalId, paymentRecordId }`.
  - `POST /api/catalogs/:id/subscription/cancel` (`requireMerchant`) → `PUT /preapproval/{id}` (`cancelled`), `autoRenew: false`, `subscriptionStatus: 'CANCELLED'`, `canceledAt`.
  - `POST /api/webhooks/pix`: tratar `subscription_preapproval` e `subscription_authorized_payment` com validação `x-signature` e idempotência por `gatewayId`.
- **Anti-cobrança dupla:** Cancelar assinatura anterior ativa no MP ao confirmar upgrade ou troca para Pix avulso.
- **Frontend & Jurídico:** `PlanSelectorModal.tsx` (Pix Avulso vs. Cartão Recorrente + aceite Decreto 7.962/2013), gestão/cancelamento em `ManagePage.tsx` (`SettingsSectionCard`) e atualização de `legalDocs.ts`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Schema mínimo (`Catalog` + `CatalogPayment`):** Adicionar `billingType` (`PIX_ONE_OFF` | `CARD_RECURRING`), `mpPreapprovalId`, `subscriptionStatus`, `autoRenew`, `canceledAt`, `nextBillingAt` e `@@index([mpPreapprovalId])` em `Catalog`; adicionar `@@unique([gatewayId])` em `CatalogPayment` para idempotência estrita (`P2002` dentro de `$transaction`). Aplicar apenas em `vitrimini-dev`.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado` — `fetch` nativo sem SDK externa, zero polling novo e zero pacotes adicionados.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend-sub` | `backend/prisma/schema.prisma`, `backend/src/utils/validation.ts`, `backend/src/services/payment.service.ts`, `backend/src/repositories/catalog.repository.ts`, `backend/src/services/catalog.service.ts`, `backend/src/controllers/catalog.controller.ts`, `backend/src/routes/catalog.routes.ts` | Schema + `prisma db push` (`vitrimini-dev`), endpoints `/subscription/card` e `/subscription/cancel`, `/preapproval`, prevenção de cobrança dupla e webhook idempotente (`P2002`) | `Concluído` |
| `dev-frontend-sub` | `frontend/src/types/catalog.ts`, `frontend/src/services/api.ts`, `frontend/src/components/PlanSelectorModal.tsx`, `frontend/src/pages/ManagePage.tsx`, `frontend/src/pages/MyCatalogsPage.tsx` | Seletor Pix Avulso vs. Cartão Recorrente + aceite Decreto 7.962/2013 em `PlanSelectorModal`, `SettingsSectionCard` **"Plano & Assinatura"** com cancelamento + modal de confirmação em `ManagePage`, e suporte em `MyCatalogsPage` | `Concluído` |
| `dev-legal` | `frontend/src/data/legalDocs.ts`, `frontend/scripts/prerender.mjs` | Termos de Uso, Política de Privacidade (Versão 2.2) e prerender atualizados com assinatura recorrente via cartão e cancelamento no painel | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Status:** `APROVADO`
- **Build Backend (`npm run build` → `prisma generate && tsc`):** Exit code `0` (Prisma Client v6.19.3 gerado + TypeScript compilado sem erros).
- **Build Frontend (`npm run build` → `tsc -b && vite build && node scripts/prerender.mjs`):** Exit code `0` (`1690` módulos transformados, build em `5.31s` e 7 páginas pré-renderizadas).
- **Idempotência do webhook:** `CatalogPayment` possui `@@unique([gatewayId])` (`backend/prisma/schema.prisma`); `confirmAuthorizedSubscriptionPaymentTx` (`backend/src/repositories/catalog.repository.ts`) opera dentro de `prisma.$transaction`, e `handleSubscriptionAuthorizedPaymentWebhook` (acionado por `processPixWebhook` em `backend/src/services/catalog.service.ts`) trata `PrismaClientKnownRequestError` `P2002` retornando de forma idempotente sem duplicar dias.
- **Zero PAN/CVV:** `createCardSubscription` (`backend/src/services/payment.service.ts`) utiliza `init_point` hospedado do Mercado Pago; `createCardSubscriptionSchema` (`backend/src/utils/validation.ts`) aceita apenas `planCode` e `autoRenewConsent: true`.
- **Prevenção de cobrança dupla:** `cancelPreviousPreapprovalIfActive` (`backend/src/services/catalog.service.ts`) é invocada na confirmação de Pix e nos webhooks de assinatura (`subscription_preapproval` / `subscription_authorized_payment`).
- **Responsividade `360px` & Design System:** `PlanSelectorModal.tsx` aplica `max-h-[90vh] overflow-y-auto`, `min-h-[44px]` e `cursor-pointer`; `ManagePage.tsx` reutiliza `SettingsSectionCard` (**"Plano & Assinatura"**); `git status` confirma ausência de novos componentes duplicados.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **AppSec & IDOR:** `POST /api/catalogs/:id/subscription/card` e `POST /api/catalogs/:id/subscription/cancel` (`backend/src/routes/catalog.routes.ts`) protegidos por `requireMerchant` + `catalogWriteRateLimiter`; posse filtrada via `findOwnedCatalogById` (`{ id, userId }`) retornando `404` (`FRIENDLY_ERRORS.NOT_FOUND`), nunca `403`. `processPixWebhook` valida `x-signature` (HMAC-SHA256 + janela anti-replay) antes de tratar `subscription_preapproval` e `subscription_authorized_payment`. Frontend aplica `safeRedirect(res.initPoint)` em `ManagePage.tsx` e `MyCatalogsPage.tsx`.
- **LGPD:** `findPublicCatalogBySlug` (`backend/src/repositories/catalog.repository.ts`) e `getPublicStoreBySlug` (`backend/src/services/catalog.service.ts`) não expõem `mpPreapprovalId`, `billingType`, `subscriptionStatus`, `autoRenew`, `canceledAt` ou `nextBillingAt`.
- **Design System & Jurídico:** `ManagePage.tsx` reutiliza `SettingsSectionCard` (**"Plano & Assinatura"**) e `PlanSelectorModal.tsx` mantém tema dinâmico (`accentColor` / `resolvedStoreTheme`), `cursor-pointer` e linguagem natural sem jargão técnico. `legalDocs.ts` e `prerender.mjs` (Versão 2.2) alinhados à recorrência via cartão e cancelamento direto no painel.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o backend (`cd backend && npm run dev`) e frontend (`cd frontend && npm run dev`).
2. Em `/gerenciar` (ou `/minhas-vitrines`), clique em renovar/escolher plano, selecione **Cartão de Crédito**, marque o aceite expresso (Decreto 7.962/2013) e clique em **Assinar com Cartão**.
3. Em `MOCK_PIX=true`, o retorno `&mock_sub=1` volta para `/painel/:id?subscription=return`; em produção/sandbox MP, conclua no `init_point` e valide o webhook `subscription_preapproval` / `subscription_authorized_payment`.
4. No bloco **Plano & Assinatura** em `/gerenciar`, teste **Cancelar renovação automática** e confirme que `autoRenew` vai para `false` mantendo `expiresAt` intacto.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
