# Dossiê da Tarefa: Central Completa Super Admin (Operação, Suporte, Financeiro, Observabilidade e Crescimento)

- **Data:** 2026-11-27
- **Tamanho:** `G`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Evolução do Painel Super Admin do VitriMini de um dashboard somente leitura para uma central operacional completa em 4 módulos (16 funcionalidades): gestão de vitrines (slug, validade, transferência, plano, exclusão segura), suporte/retenção (impersonate seguro, radar de vencimentos com WhatsApp e régua de e-mail, health score, ações em usuários), financeiro/observabilidade (reconciliação MP, MRR/receita, Central de Falhas Gerais "Mini-Sentry", log de webhooks, retry Brevo) e crescimento/auditoria (paginação/filtros, cupons promocionais, aviso global e trilha de auditoria).

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1 (UI):** Componentes acessíveis nativos sem novas dependências (`@radix-ui/*` fora). → **Resposta:** `1A`
- **Pergunta 2 (Cupons):** Liberação direta de dias grátis na vitrine (1 resgate por usuário). → **Resposta:** `2A`
- **Pergunta 3 (Régua de vencimentos):** Subir desligada por padrão (`false`) para validação em dry-run antes de ligar no painel. → **Resposta:** `3B`
- **Pergunta 4 (Retenção de logs):** 30 dias (`PaymentWebhookLog` e `SystemErrorLog` resolvidos/ignorados) e 90 dias (`AdminAuditLog`). → **Resposta:** `4A`
- **Reforço:** SQL idempotente final deve incluir todos os índices/constraints únicos das tabelas novas + `ENABLE ROW LEVEL SECURITY`.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Manter `/api/admin` em `admin.routes.ts` (rotas fixas antes de `/:id`) delegando para services por domínio (`adminCatalog.service.ts`, `adminSupport.service.ts`, `adminFinance.service.ts`, `adminGrowth.service.ts`, `telemetry.service.ts`, `audit.service.ts`, `errorLog.service.ts`). No frontend, `AdminDashboardPage.tsx` (lazy-loaded) será modularizada por abas usando modais/drawers/abas acessíveis nativos (`role="dialog"`, `aria-modal="true"`, `cursor-pointer`) no padrão de `PlanSelectorModal.tsx`, sem instalar `@radix-ui/*` ou libs pesadas.
- **Endpoints & Segurança:**
  - **Gestão de Vitrines & Usuários:** `GET /api/admin/catalogs`, `PATCH /api/admin/catalogs/:id/slug`, `PATCH /api/admin/catalogs/:id/lifecycle`, `PATCH /api/admin/catalogs/:id/plan`, `POST /api/admin/catalogs/:id/transfer`, `DELETE /api/admin/catalogs/:id`, `GET /api/admin/users`, `POST /api/admin/users/:id/impersonate`, `POST /api/admin/users/:id/resend-welcome`, `POST /api/admin/users/:id/reset-password-link`.
  - **Impersonate Seguro:** `AuthUserPayload` ganha `isImpersonation?: boolean; impersonatedBy?: string;`. Token curto (`30m`) sem tocar no cookie `HttpOnly` de refresh do admin; `requireAdmin` e rotas sensíveis de conta (trocar senha/e-mail, deletar conta) bloqueiam `isImpersonation === true`.
  - **Radar, Financeiro & Observabilidade:** `GET /api/admin/radar`, `POST /api/admin/radar/:catalogId/notify`, `POST /api/admin/radar/run`, `GET /api/admin/finance/summary`, `GET /api/admin/payments`, `POST /api/admin/payments/:id/reconcile`, `GET /api/admin/webhooks`, `GET /api/admin/errors`, `PATCH /api/admin/errors/:id`, `DELETE /api/admin/errors/resolved`, `GET /api/admin/emails`, `POST /api/admin/emails/:id/retry`, `GET /api/admin/audit-logs`.
  - **Crescimento & Públicas:** `GET/POST/PATCH /api/admin/coupons`, `GET/POST/PATCH /api/admin/announcements`, `POST /api/telemetry/client-error` (pública com rate-limit rigoroso), `GET /api/coupons/validate`, `GET /api/announcements/active` (cache leve 60s).
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[Sessão / Falso Logado]` (impersonate via token temporário sem quebrar sessão do admin), `[Rate-Limit + Polling]` (limpeza on-access de `Map`s e rate-limit na telemetria), `[Interatividade]` (`cursor-pointer` em todos os controles), `[Isolamento de Banco]` (`vitrimini-dev` apenas).
- **Fora de escopo:** Instalação de `@radix-ui/*`, `recharts` ou `@sentry/*`; `git push`; alteração de banco de produção.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado com ressalvas`
- **Schema & Índices (`@@index`):**
  - `AdminAuditLog`: `@@index([createdAt(sort: Desc)])`, `@@index([targetType, targetId, createdAt])`, `@@index([action, createdAt])`.
  - `SystemErrorLog`: `fingerprint` `@unique` (upsert com `occurrenceCount: { increment: 1 }` e reabertura se `RESOLVED`), `@@index([status, lastSeenAt(sort: Desc)])`, `@@index([source, severity])`.
  - `PaymentWebhookLog`: `@@index([createdAt(sort: Desc)])`, `@@index([status, createdAt])`, `@@index([externalResourceId])`. Payload truncado/sanitizado.
  - `PromoCoupon` & `PromoCouponRedemption`: `PromoCoupon.code` `@unique`, `@@index([isActive, expiresAt])`; `PromoCouponRedemption` com `@@unique([couponId, userId])`, `@@index([userId])`.
  - `GlobalAnnouncement`: `@@index([isActive, startsAt, endsAt])`.
  - `User` & `Catalog`: `User.lastLoginAt` (`@@index([lastLoginAt])`) e `Catalog.lastExpirationNoticeStage` / `Catalog.lastExpirationNoticeAt` de forma aditiva (preservando `notified7DaysBefore` e `notifiedExpiration`). `@@index([status, expiresAt])` em `Catalog` e `@@index([catalogId])` em `CatalogPayment`.
- **RLS & Retenção:** SQL idempotente obrigatório com `ALTER TABLE "public"."<Tabela>" ENABLE ROW LEVEL SECURITY;` nas 6 novas tabelas. Purge automático (> 30–60 dias) para `PaymentWebhookLog`, `SystemErrorLog` resolvidos e `AdminAuditLog` antigos.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** Health Score via `_count` (zero N+1, sem `mpAccessToken`/`mpRefreshToken`/`bioLinksConfig`). Resgate de cupom atômico em `$transaction` (capturando `P2002` → `409`). Transferência/exclusão de vitrine + `AdminAuditLog` na mesma `$transaction`.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado com ressalvas`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:**
  - **Brevo:** Contabilizar envios do dia (`America/Sao_Paulo`) via `EmailLog`. Trava rígida em 80% (`240/300`) bloqueando régua automática (`D-3`, `D-0`, `D+2`) e e-mails não-críticos, reservando 60/dia para transacionais (`WELCOME`, `NEW_ORDER`, reset senha). Deduplicação persistida no `Catalog` contra restarts do Render.
  - **Render & Supabase:** Acoplar purge de logs ao `startCleanupScheduler()` já existente (`cleanup.service.ts`). Rate-limit rigoroso + truncamento em `POST /api/telemetry/client-error`. Limpeza on-access de qualquer `Map` em memória.
  - **Cloudflare Pages & R2:** Zero libs pesadas no bundle; exclusão de vitrine no Admin reutiliza `deleteImagesFromR2` em lote único; polling no Admin (se houver) pausado com `document.visibilityState === 'hidden'`.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend-infra` | `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261127_super_admin_panel.sql`, `backend/src/utils/redact.ts`, `backend/src/services/audit.service.ts`, `backend/src/services/errorLog.service.ts`, `backend/src/routes/telemetry.routes.ts`, `backend/src/middlewares/errorHandler.ts`, `backend/src/services/cleanup.service.ts`, `backend/src/server.ts` | Schema + SQL idempotente c/ RLS + redaction + Mini-Sentry + telemetria + purge | `Concluído` |
| `dev-backend-ops` | `backend/src/middlewares/auth.ts`, `backend/src/services/auth.service.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/utils/adminValidation.ts`, `backend/src/services/adminCatalog.service.ts`, `backend/src/services/adminSupport.service.ts`, `backend/src/services/adminFinance.service.ts`, `backend/src/services/adminRadar.service.ts`, `backend/src/services/adminGrowth.service.ts`, `backend/src/services/email.service.ts`, `backend/src/services/catalog.service.ts`, `backend/src/controllers/catalog.controller.ts`, `backend/src/controllers/admin.controller.ts`, `backend/src/routes/admin.routes.ts`, `backend/src/routes/publicGrowth.routes.ts`, `backend/src/services/admin.service.ts` | Gestão de vitrines, usuários, impersonate, financeiro/MP, radar Brevo, cupons, aviso global e auditoria | `Concluído` |
| `dev-frontend` | `frontend/src/types/admin.ts`, `frontend/src/types/catalog.ts`, `frontend/src/services/adminApi.ts`, `frontend/src/services/api.ts`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/App.tsx`, `frontend/src/components/GlobalErrorBoundary.tsx`, `frontend/src/components/ImpersonationBanner.tsx`, `frontend/src/components/GlobalAnnouncementBanner.tsx`, `frontend/src/components/admin/*.tsx`, `frontend/src/pages/AdminDashboardPage.tsx`, `frontend/src/pages/CreatorPage.tsx`, `frontend/src/pages/MyCatalogsPage.tsx` | Novo Painel Super Admin modular (7 abas), ImpersonateBanner, GlobalAnnouncementBanner, ?cupom= e ErrorBoundary | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/backend` (`exit code 0` via `prisma generate && tsc`) | `/frontend` (`exit code 0` via `tsc -b && vite build && prerender`) | `prisma generate` (`exit code 0`)
- **Edge cases:** Mobile/WhatsApp (`APROVADO` — fallback "Sem WhatsApp" e links `wa.me`), `America/Sao_Paulo` (`APROVADO` — trava 80% Brevo `240/300` e deduplicação em DB), estados vazios (`APROVADO`), `confirmSlug` na exclusão (`APROVADO`), SQL idempotente com RLS e unique indexes (`APROVADO`)
- **Apontamentos (se houver):**
  - _Nenhum._

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:** Auth/ownership (`APROVADO`) | LGPD rotas públicas (`APROVADO`) | Sanitização/Open-Redirect (`APROVADO`) | Ordem rotas Express (`APROVADO`) | Tema dinâmico & `cursor-pointer` (`APROVADO`)
- **Veredito:** `APROVADO`
- **Apontamentos (se houver):**
  - `requireAdmin` bloqueia `isImpersonation`, valida `ADMIN_EMAILS` e reconfirma no banco; `redact.ts` sanitiza JWTs/Bearer/cartões/chaves sensíveis; ordem das rotas Express correta; zero jargão técnico em `CreatorPage.tsx`; `ctaUrl` validado.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Aplicar `backend/prisma/migrations/20261127_super_admin_panel.sql` no SQL Editor do banco `vitrimini-dev` (ou Supabase antes do deploy).
2. Subir backend (`cd backend && npm run dev`) e frontend (`cd frontend && npm run dev`).
3. Acessar `/super-admin`, testar as 7 abas (Vitrines, Usuários + Impersonate, Radar + Dry-run, Financeiro + Verificar no MP, Central de Erros + Copiar Markdown, Cupons + `?cupom=`, Aviso Global em `/minhas-vitrines` e Auditoria).

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
