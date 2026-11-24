# Dossiê da Tarefa: Blindagem de Segurança (IDOR, Anti-Enumeração, Rate-Limit e RBAC)

- **Data:** 2026-11-24
- **Tamanho:** `G`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Blindar as rotas privadas e parametrizadas do backend contra IDOR e enumeração de UUIDs: amarrar consultas/updates diretamente ao `userId` do JWT no Prisma retornando `404` (nunca `403` que revela existência), cobrir todas as rotas `:id` e webhooks com `rate-limit` por `userId`+IP, adicionar proteção leve contra varredura de `401`/`404` em sequência e reforçar isolamento de papéis sem quebrar o fluxo de compra/criação de vitrine.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1 (RBAC Comprador vs. Lojista):** Posse automática em `Catalog` (`requireMerchant` sem migração no banco; quem cria a 1ª vitrine vira lojista na hora).
- **Pergunta 2 (Estrutura de camadas no backend):** Refatorar todas as rotas neste mesmo PR em `routes/` → `controllers/` → `services/` → `repositories/`.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:**
  - **Anti-IDOR (`404` anti-enumeração):** Substituir `findUnique({ id })` + `403` por consultas filtradas direto na posse (`where: { id, userId }` / `where: { editToken, userId }` / `where: { id: orderId, catalogId, catalog: { userId } }` / `product.updateMany({ where: { id, catalogId } })`) retornando `404` quando inexistente ou de outro lojista. Manter `403` apenas para travas de plano na própria vitrine.
  - **Rate-Limit (`userId || ip`) + `scanGuard`:** Novo `backend/src/middlewares/rateLimitGuard.ts` com `userOrIpKeyGenerator` (`ipKeyGenerator` do `express-rate-limit` v8), cobrindo todas as rotas `:id` e `POST /webhooks/pix`, além de `scanGuard` em memória (`30` respostas `401`/`404` em `5 min` → bloqueio `429` por `5 min`, limpeza *on-access* e teto `5.000` chaves).
  - **RBAC (`requireMerchant`):** Sem coluna nova no banco; `requireMerchant` em `auth.ts` exige ao menos 1 vitrine própria (cache positivo `5 min` em memória) para rotas do painel `/catalogs/:id/*`, mantendo `POST /catalogs`, `GET /my-catalogs` e rotas de pedido do comprador com `requireAuth`.
- **Endpoints / Payloads Zod / Tipos TS:** Contratos 2xx e schemas Zod inalterados.
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[Rate-Limit + Polling]` (folga ≥ 3x p/ polling + limpeza *on-access* de `Map`s) e `[UX Writing / Zero Jargão]`.
- **Fora de escopo:** Refatoração estrutural completa em pastas `controllers/` + `repositories/` e Redis externo.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Schema & Índices (`@@index`):** Zero alterações em `schema.prisma`; todos os 8 models já usam `@id @default(uuid())`. Índices atuais (`@@index([userId])`, `@@index([catalogId, ...])`) cobrem `where: { id, userId }` e `updateMany` em 1 round-trip sem índices redundantes.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** `select` enxuto auditado e aprovado em `GET /store/:slug` e `GET /orders/track/:trackingCode` (zero vazamento de hashes/tokens/dados pessoais).

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Com ressalvas`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:** Zero custo extra em Supabase/R2/Brevo/Cloudflare. No Render (512 MB RAM), proibido `setInterval`; `Map`s em `rateLimitGuard.ts` e `requireMerchant` devem ter limpeza *on-access* + teto `MAX_ENTRIES = 5_000`, preservando folga de polling (`120–180 req / 15 min`).

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-security-core` | `backend/src/middlewares/auth.ts`, `backend/src/middlewares/rateLimitGuard.ts`, `backend/src/server.ts` | `requireMerchant` + `markMerchantCache`, `scanGuard` e limiters por `userId \|\| ip` | `Concluído` |
| `dev-catalog` | `backend/src/repositories/catalog.repository.ts`, `backend/src/services/catalog.service.ts`, `backend/src/controllers/catalog.controller.ts`, `backend/src/routes/catalog.routes.ts` | 4 camadas + anti-IDOR `404` (`{ id, userId }`, `product.updateMany`) + `requireMerchant` + rate-limits | `Concluído` |
| `dev-orders-mp` | `backend/src/repositories/order.repository.ts`, `backend/src/repositories/mp.repository.ts`, `backend/src/services/order.service.ts`, `backend/src/services/mpIntegration.service.ts`, `backend/src/controllers/order.controller.ts`, `backend/src/controllers/mp.controller.ts`, `backend/src/routes/order.routes.ts`, `backend/src/routes/mp.routes.ts` | 4 camadas + anti-IDOR `404` em pedidos/analytics/MP + `requireMerchant` + rate-limits | `Concluído` |
| `dev-auth-admin` | `backend/src/repositories/auth.repository.ts`, `backend/src/repositories/admin.repository.ts`, `backend/src/services/auth.service.ts`, `backend/src/services/admin.service.ts`, `backend/src/controllers/auth.controller.ts`, `backend/src/controllers/admin.controller.ts`, `backend/src/routes/auth.routes.ts`, `backend/src/routes/admin.routes.ts` | 4 camadas + `select` explícito + lockout/cooldown *on-access* + rate-limit em `/auth/me` e `/admin/overview` | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Veredito:** `APROVADO`
- **Builds (`exit code 0`):**
  - `backend` (`npm run build` → `prisma generate && tsc`): `OK (0)`
  - `frontend` (`npm run build` → `tsc -b && vite build && node scripts/prerender.mjs`): `OK (0)` (7 rotas pré-renderizadas sem erros)
- **Auditoria Estática de Código:**
  - **Separação de camadas:** `OK` — nenhum arquivo em `backend/src/routes/*.routes.ts`, `backend/src/controllers/*.controller.ts` ou nos services refatorados (`catalog`, `order`, `mpIntegration`, `auth`, `admin`) importa `prisma` diretamente; todo acesso `prisma.*` dessas rotas está isolado em `repositories/*.repository.ts` e nos middlewares de `auth.ts`.
  - **Blindagem Anti-IDOR (`404`):** `OK` — zero comparações `userId !==` no backend; todas as rotas privadas de catálogo, pedidos, analytics e Mercado Pago filtram posse diretamente no Prisma (`{ id, userId }`, `{ editToken, userId }`, `{ id: orderId, catalogId, catalog: { userId } }`, `product.updateMany/deleteMany` com `catalogId`) retornando `404`. Respostas `403` restritas apenas a RBAC (`requireAdmin`/`requireMerchant`), origem/ambiente e travas de Plano Pro na própria vitrine.
  - **Proteção de memória (Render 512 MB):** `OK` — nenhum `setInterval` adicionado nos novos middlewares/services; todos os `Map`s (`scanMap` em `rateLimitGuard.ts`, `merchantCache` em `auth.ts`, `loginLockouts` e `forgotPasswordCooldowns` em `auth.service.ts`) possuem limpeza *on-access* e teto `5.000` chaves com despejo FIFO.
  - **Ordem das rotas Express:** `OK` — `scanGuard` aplicado em `/api` antes dos routers; `/catalogs/resolve-token/:editToken` registrada antes de `/catalogs/:id`; `/orders/mine` e `/orders/track/:trackingCode` sem colisão; `orderRoutes` e `mpRoutes` montados antes de `catalogRoutes`.
- **Smoke Test em Memória (`VITRIMINI_TEST_MODE=true` em `dist/server.js`, porta efêmera `0`, zero escrita no banco):**
  - `GET /health` → `200` (`{"status":"ok",...}`)
  - `GET /api/my-catalogs` (sem token) → `401` (`{"error":"Entre na sua conta para continuar."}`)
  - `scanGuard` em `/api/rota-inexistente-scan-test` (31 requisições seguidas) → requisições `1..30` retornaram `404` e a `31ª` foi bloqueada com `429` (`{"error":"Muitas tentativas inválidas em sequência. Aguarde alguns minutos e tente novamente."}`)

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **Checklist de Auditoria (`Ciclo 1`):**
  - [x] **1. IDOR & Anti-Enumeração (`404`):** Todas as leituras/escritas privadas de vitrines (`/catalogs/:id*`, `/manage/:editToken`, `/catalogs/resolve-token/:editToken`), produtos (`product.updateMany`/`deleteMany` filtrados por `catalogId` + whitelist de IDs/imagens da própria vitrine), pedidos/analytics (`/catalogs/:id/orders*`, `/catalogs/:id/analytics` com `{ catalogId, catalog: { userId } }`) e Mercado Pago (`connect`, `callback`, `toggle`, `disconnect` com `{ id: catalogId, userId }`) filtram posse diretamente no banco e retornam `404` sem vazar existência via `403`.
  - [x] **2. RBAC, Auth & Sessão:** `requireMerchant` protege todas as rotas do painel lojista (com cache positivo `5 min`, limpeza *on-access*, teto `5.000` e ativação imediata via `markMerchantCache` na criação da 1ª vitrine), `requireAuth` preservado para criação de vitrine/pedidos do comprador, `requireAdmin` com dupla checagem (`ADMIN_EMAILS` + banco), JWT `HS256` validado, CORS explícito (sem `*`), proteção de origem em `/refresh` e `/logout`, e cookie `vitrimini_refresh_token` configurado com `HttpOnly`, `SameSite=Lax`, `Secure` e `Domain=.vitrimini.com.br` em produção.
  - [x] **3. LGPD & Projeção (`select`):** `GET /api/store/:slug` projeta e serializa apenas dados públicos da vitrine (nunca expõe `userId`, `editToken`, `mpAccessToken` ou `mpRefreshToken`); `GET /api/orders/track/:trackingCode` nunca seleciona nem retorna `customerName`, `customerPhone`, `deliveryAddress`, `notes` ou IDs internos de pagamento; rotas de `auth` usam `select` explícito e objeto público enxuto sem vazar `passwordHash` ou `passwordResetTokenHash`.
  - [x] **4. Webhooks, Uploads, Rate-Limit & Express:** Assinatura HMAC-SHA256 (`x-signature` + `x-request-id` + janela anti-replay de 15 min + `timingSafeEqual`) ativa em `/webhooks/pix` e `/webhooks/mercadopago/orders`; `assertValidImageMagicBytes` + limite 5 MB em `createCatalog` e `updateOwnedCatalog`; `userOrIpKeyGenerator` (`ipKeyGenerator` IPv6-safe + fallback `getOptionalAuthUserId`) aplicado nos limiters com folga para polling (`180 req/15 min` no painel e `120 req/15 min` no rastreio); `scanGuard` ativo em `/api` (`30` respostas `401`/`404` em `5 min` → `429` por `5 min`, zero `setInterval`, teto `5.000`); rotas fixas declaradas antes de rotas dinâmicas e callback OAuth sem *open redirect*.
  - [x] **5. UX Writing (Zero Jargão):** Todas as mensagens voltadas a lojistas e compradores em `requireAuth`, `requireMerchant`, `scanGuard`, rate-limiters, `auth.service` e validação de parâmetros (`Código inválido.`) usam linguagem natural em português, sem jargão técnico.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o backend (`cd backend && npm run dev`) e frontend (`cd frontend && npm run dev`).
2. Com uma conta sem vitrines (comprador puro), chame `GET /api/catalogs/<uuid>` → deve retornar `403` (`requireMerchant`), mantendo `GET /api/my-catalogs` e `POST /api/catalogs` funcionando normalmente.
3. Com uma conta lojista A, chame `GET/PUT /api/catalogs/<uuid-da-loja-B>` → deve retornar `404` (anti-enumeração).
4. Dispare >30 chamadas `404`/`401` seguidas em `/api/*` → a 31ª deve ser bloqueada com `429` pelo `scanGuard`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Sim`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `[IDOR / Anti-Enumeração]` → Em rotas privadas parametrizadas, filtrar posse direto no Prisma (`where: { id, userId }` / `updateMany({ where: { id, catalogId } })`), aplicar `requireMerchant` no painel e retornar `404` (nunca `403`, que revela existência do UUID). *(promovida para `.agent/memory/lessons-learned.md`? `Sim`)*
