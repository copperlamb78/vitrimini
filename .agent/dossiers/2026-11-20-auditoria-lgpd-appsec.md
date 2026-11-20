# Dossiê da Tarefa: Auditoria e Blindagem LGPD + AppSec

- **Data:** 2026-11-20
- **Tamanho:** `G`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Pente fino completo de LGPD e Cibersegurança no `/backend` e `/frontend` antes de escalar para mais lojistas. A base atual já possui boas defesas (Helmet, CORS explícito, cookies `HttpOnly`, Zod anti-XSS e ownership), mas foram identificadas lacunas pontuais de rate-limit, logs de erro, validação real de upload (magic bytes) e hardening de URLs/redirects.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **P1 (Rate-limit):** `A` ajustado → `GET /api/orders/track/:trackingCode` (`120 req / 15 min` por IP), `GET /api/store/:slug` (`120 req / 5 min` por IP), `POST /api/auth/refresh` e `POST /api/auth/logout` (`20 req / 15 min` por IP).
- **P2 (Brevo / Forgot Password):** `A` ajustado → `5 req / 15 min` por IP (independente de `AUTH_RATE_LIMIT_MAX`) + cooldown de `2 min` por e-mail normalizado em `Map` com limpeza on-access de entradas expiradas (sem vazar memória).
- **P3 (Upload & `imageUrl`):** `A` → checagem de *magic bytes* reais (JPEG/PNG/WebP/AVIF) no upload + `imageUrl` restrita a `https://` ou `/` em produção (mantendo `http://localhost` / `http://127.0.0.1` em dev).
- **P4 (Logs em produção):** `A` ajustado → em `NODE_ENV === 'production'`, logar apenas `err.name`, `err.message`, `err.code` (se existir) e `method`/`path` (sem dump completo nem stack trace).

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Endurecer middlewares, rate-limiters, validação de arquivo (magic bytes sem novas libs pesadas) e sanitização de logs/URLs nos arquivos existentes, sem introduzir Redis ou dependências pagas.
- **Achados Principais da Auditoria:**
  - *Já sólido:* `helmet`, CORS explícito (`allowedOrigins`), `express.json({ limit: '200kb' })`, `requireAuth` + ownership nas rotas `/catalogs/:id/*` e `/manage/:editToken`, `requireAdmin` em `/api/admin/*`, `GET /api/orders/track/:trackingCode` sem PII do comprador (`customerPhone`/`deliveryAddress` omitidos), `sanitizePlainText` no Zod e `updateOrderStatusSchema` bloqueando `OUT_FOR_DELIVERY` para `PICKUP`.
  - *Lacunas a corrigir:*
    1. `GET /api/orders/track/:trackingCode` e `GET /api/store/:slug` sem `rateLimit`.
    2. `POST /api/auth/refresh` e `POST /api/auth/logout` sem `rateLimit`; `passwordResetRateLimiter` herdando `AUTH_RATE_LIMIT_MAX`.
    3. `errorHandler.ts` logando objeto `err` completo no `console.error` (risco de vazar headers/tokens em produção).
    4. `upload.ts` confia apenas no `file.mimetype` do cliente (sem checagem de magic bytes no buffer).
    5. `validation.ts` (`imageUrl`) aceita `http://`; `AuthPage.tsx` (`redirect`) pode bloquear também `/\`.
    6. `JWT_SECRET` validado apenas sob demanda em `auth.ts` (não no boot em produção).
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[Refresh Token + CORS]`, `[LGPD / Tracking Público]`, `[Isolamento de Banco]` — todas verificadas e preservadas.
- **Fora de escopo:** Alteração de `schema.prisma`, introdução de WAF/Redis externo ou troca do provedor de e-mail.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Schema & Índices (`@@index`):** Nenhuma alteração em `backend/prisma/schema.prisma` necessária.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** Rotas públicas já usam `select` enxuto; rate-limit em `/orders/track/:trackingCode` e `/store/:slug` reduzirá pressão de leitura no Supabase.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Com ressalvas` (a endereçar na execução)
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:**
  - Endurecer `/api/auth/forgot-password` (rate-limit independente + cooldown por e-mail em memória) protege a cota de 300 e-mails/dia da Brevo sem custo extra.
  - Rate-limit em `/orders/track/:trackingCode` e `/store/:slug` protege CPU/memória do Render e conexões do Supabase contra bots.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend` | `backend/src/middlewares/auth.ts`, `backend/src/server.ts`, `backend/src/middlewares/errorHandler.ts`, `backend/src/routes/auth.routes.ts`, `backend/src/routes/order.routes.ts`, `backend/src/routes/catalog.routes.ts`, `backend/src/config/upload.ts`, `backend/src/utils/validation.ts` | Fail-fast `JWT_SECRET`, logs sanitizados em prod, rate-limits (`/refresh`, `/logout`, `/forgot-password`, `/track`, `/store/:slug`), cooldown 2min Brevo, magic bytes upload, `imageUrl` `https://` (`tsc --noEmit` OK) | `Concluído` |
| `dev-frontend` | `frontend/src/pages/AuthPage.tsx` | Blindagem `safeRedirect` contra `/\` e chars de controle (`tsc --noEmit` OK) | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:**
  - `/frontend` (`npm run build` → `tsc -b && vite build`): **exit code 0** (5.96s).
  - `/backend` (`npm run build` → `prisma generate && tsc`): `prisma generate` retornou `EPERM` no Windows (`query_engine-windows.dll.node` em uso por processo local); `npx tsc -p backend/tsconfig.json` passou com **exit code 0** (sem alterações em `schema.prisma`).
- **Storage & Magic Bytes (`upload.ts`):** Confirmado `multer.memoryStorage()` (`file.buffer` sempre disponível em memória antes do envio ao R2); `assertValidImageMagicBytes` valida JPEG, PNG, WebP e AVIF corretamente.
- **Edge cases:** Polling de 20s (`OrderTrackingPage`) comportado por `120 req/15 min`; cooldown 2 min no `forgot-password` com limpeza on-access do `Map` e resposta `200` neutra; `imageUrl` aceita `https://`, `/` e `http://localhost`/`127.0.0.1` em dev; `safeRedirect` bloqueia `//`, `/\` e chars de controle.
- **Veredito QA:** `APROVADO` *(ressalva operacional: rodar `npm run build` no `/backend` após parar o servidor local se quiser re-executar `prisma generate`)*.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:** Auth/ownership (`OK` — `requireAuth` + `userId` em `/catalogs/:id/*` e `/manage/:editToken`, `requireAdmin` em `/api/admin/*`, fail-fast `JWT_SECRET` no boot) | LGPD rotas públicas (`OK` — `/orders/track/:trackingCode` e `/store/:slug` sem PII do comprador; logs sanitizados em produção com `method`, `path`, `name`, `message`, `code?`) | Sanitização/Open-Redirect (`OK` — `safeRedirect` endurecido, `imageUrl` sem `http://` genérico em prod, *magic bytes* antes do R2) | Ordem rotas Express (`OK` — `/catalogs/resolve-token/:editToken` antes de `/catalogs/:id`) | Tema dinâmico & `cursor-pointer` (`OK` — sem regressões visuais).
- **Veredito:** `APROVADO`

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o `/backend` (`npm run dev` apontando para `vitrimini-dev`) e o `/frontend` (`npm run dev`).
2. Acesse `/entrar?redirect=//evil.com` e `/entrar?redirect=/\evil.com`, faça login e confirme redirecionamento seguro para `/minhas-vitrines` (e que `/entrar?redirect=/minhas-vitrines` funciona).
3. Teste upload de imagem válida (JPG/PNG/WebP) ao criar/editar vitrine; opcionalmente renomeie um `.txt` para `.jpg` e confirme rejeição amigável `400`.
4. Solicite "Esqueci minha senha" duas vezes seguidas em menos de 2 min para o mesmo e-mail e confirme resposta `200` neutra sem disparar segundo e-mail na Brevo.
5. Abra `/pedido/<trackingCode>` e deixe o polling de 20s rodar normalmente sem erro `429`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Sim` (ajuste do usuário no dimensionamento de rate-limit considerando polling de 20s + limpeza on-access de `Map` em memória).
- **Lição promovida:** `[Rate-Limit + Polling]` → Ao aplicar `rateLimit` em rotas com polling (ex.: `OrderTrackingPage` a cada 20s = 45 req/15 min), dimensionar folga para múltiplos usuários no mesmo Wi-Fi (ex.: `120 req/15 min`) e limpar `Map`s de cooldown on-access para evitar vazamento de memória no Render. *(Promovida para `.agent/memory/lessons-learned.md`: `Sim`)*
