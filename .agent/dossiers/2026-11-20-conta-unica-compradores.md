# Dossiê da Tarefa: Conta Única de Compradores + Meus Pedidos + KPIs Super Admin

- **Data:** 2026-11-20
- **Tamanho:** `M`
- **Status Atual:** `Concluído`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Permitir que compradores usem a mesma conta (`User`) da VitriMini para comprar em qualquer vitrine com preenchimento automático de nome/WhatsApp, vincular pedidos ao usuário quando logado sem bloquear compras de visitantes, criar a tela `/meus-pedidos` e exibir no Super Admin quantos usuários têm vitrine vs. apenas compradores.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1 (Pós-login sem `?redirect=`):** **C** — Ir para `/meus-pedidos` apenas se tiver `orders > 0` e `catalogs === 0`; caso contrário `/minhas-vitrines` (retornando `_count: { catalogs, orders }` já no `POST /api/auth/login` e `GET /api/auth/me` para evitar requisições em cascata).
- **Pergunta 2 (Atalho "Meus Pedidos" no header):** **A** — No header da Landing Page, das Vitrines (`StorePage.tsx`, discreto sem competir com a marca/tema) e de `Minhas Vitrines`.
- **Pergunta 3 (Lista `/meus-pedidos`):** **A** — Lista limpa do mais recente ao mais antigo com link direto para `/pedido/:trackingCode`.
- **Cuidados extras:** Tratar `user.phone` com segurança caso esteja vazio; rodar `prisma db push` e `prisma generate` apenas em `vitrimini-dev`.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:**
  - **Conta única (`User`):** Reaproveitar `User` (que já possui `phone` no `schema.prisma`, `POST /api/auth/register` e `GET /api/auth/me`) sem criar tabela separada.
  - **Vínculo opcional no pedido:** Em `Order`, adicionar `userId String?` (`onDelete: SetNull`, `@@index([userId, createdAt])`). Em `POST /api/store/:slug/orders`, usar `getOptionalAuthUserId(req)` (já existente em `backend/src/middlewares/auth.ts`); se válido, gravar `userId`. Visitantes continuam comprando normalmente (`userId: null`).
  - **Auto-preenchimento na vitrine (`StorePage.tsx`):** Ler `user` de `useAuth()`. Se logado e campos vazios, preencher `customerName = user.name` e `customerPhone = formatPhoneMask(user.phone)`. Se deslogado, exibir atalho discreto para `/entrar?redirect=/c/${slug}`.
  - **Histórico `/meus-pedidos`:** Registrar rota fixa `GET /api/orders/mine` (`requireAuth`, `where: { userId: req.user!.id }`, `orderBy: { createdAt: 'desc' }`, `take: 50`, `select` enxuto) + página `MyOrdersPage.tsx` (`/meus-pedidos` com `React.lazy` e Skeleton Loader).
  - **KPIs Super Admin (`admin.routes.ts`):** Adicionar `usersWithCatalogs` no `Promise.all` de `GET /api/admin/overview` (`prisma.user.count({ where: { catalogs: { some: {} } } })`) e derivar `buyersOnly = Math.max(0, totalUsers - usersWithCatalogs)`.
- **Endpoints / Payloads Zod / Tipos TS:**
  - `POST /api/store/:slug/orders` → mantém `createOrderSchema`; `userId` vem exclusivamente do JWT via `getOptionalAuthUserId`.
  - `GET /api/orders/mine` *(fixa, `requireAuth`)* → retorna `{ orders }` com `orderNumber`, `trackingCode`, `status`, `deliveryType`, `totalCents`, `createdAt`, `catalog: { storeName, slug, logoUrl, themeColor }` e `items`.
  - `GET /api/admin/overview` *(já existente, `requireAdmin`)* → acrescenta `usersWithCatalogs` em `saas`.
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[Sessão / Falso Logado]`, `[LGPD / Tracking Público]`, `[Interatividade]` (`cursor-pointer`) e `[Isolamento de Banco]` (`vitrimini-dev`).
- **Fora de escopo:** Login separado de comprador, exigir login para comprar, salvar endereços no perfil ou vincular pedidos antigos retroativamente por telefone/e-mail.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Schema & Índices (`@@index`):**
  - `Order.userId String?` com relação `User` (`onDelete: SetNull`) e `orders Order[]` em `User`: migração aditiva e não destrutiva.
  - `@@index([userId, createdAt])` em `Order` cobre filtro e ordenação de `GET /api/orders/mine` sem sort em memória.
  - `Catalog` já possui `@@index([userId])`, suportando `usersWithCatalogs` sem N+1.
  - **Isolamento (`vitrimini-dev`):** rodar `prisma db push` e `prisma generate` exclusivamente contra `vitrimini-dev`.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):**
  - `POST /api/store/:slug/orders` mantém atribuição opcional de `userId` dentro do `$transaction` com retry de `P2002`.
  - `GET /api/orders/mine` usa query única com `take: 50` e `select` enxuto (sem `deliveryAddress`, `notes` ou `pixKey`).
  - `GET /api/admin/overview` usa `prisma.user.count({ where: { catalogs: { some: {} } } })` dentro do `Promise.all` existente.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Com ressalvas`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:**
  - **Brevo (300/dia):** Não introduzir novos disparos de e-mail para compradores; usar UI (`/meus-pedidos` / tracking) + WhatsApp.
  - **Render & Supabase:** Reutilizar `prisma` existente; KPIs via `count` no banco; `take: 50` em `/api/orders/mine`.
  - **Cloudflare Pages:** `/meus-pedidos` com `React.lazy` para não inflar o bundle da vitrine; zero dependências extras.
  - **Polling:** Sem polling contínuo em `/meus-pedidos` (busca ao montar + botão atualizar).

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend` | `backend/prisma/schema.prisma`, `backend/src/routes/auth.routes.ts`, `backend/src/routes/order.routes.ts`, `backend/src/routes/admin.routes.ts` | Relação opcional `Order.userId` (`SetNull` + `@@index([userId, createdAt])`), `_count: { catalogs, orders }` em `POST /login` e `GET /me`, vínculo opcional via `getOptionalAuthUserId` em `POST /store/:slug/orders`, nova rota `GET /orders/mine` (`requireAuth`, `take: 50`, `select` enxuto, `Cache-Control: no-store`), e `usersWithCatalogs` em `GET /admin/overview`. | `Concluído` |
| `dev-frontend` | `frontend/src/types/catalog.ts`, `frontend/src/services/api.ts`, `frontend/src/components/Skeletons.tsx`, `frontend/src/pages/AuthPage.tsx`, `frontend/src/pages/StorePage.tsx`, `frontend/src/pages/LandingPage.tsx`, `frontend/src/pages/MyCatalogsPage.tsx`, `frontend/src/pages/MyOrdersPage.tsx`, `frontend/src/pages/AdminDashboardPage.tsx`, `frontend/src/App.tsx` | Tipos/API (`getMyOrders`, `createStoreOrder` enviando `Authorization` opcional), `MyOrdersSkeleton`, página `/meus-pedidos` (`MyOrdersPage`) com lazy load, regra 1-C em `AuthPage.tsx`, pré-preenchimento + atalho discreto em `StorePage.tsx` (sem bloquear guest checkout), links `/meus-pedidos` em `LandingPage.tsx` e `MyCatalogsPage.tsx`, e breakdown de usuários em `AdminDashboardPage.tsx`. | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/backend` (`Passou — tsc exit 0`) | `/frontend` (`Passou — tsc -b && vite build exit 0, MyOrdersPage chunk 6.48 kB`) | `prisma db push` em `vitrimini-dev` + `prisma generate` (`Passou — v6.19.3`)
- **Edge cases:** Guest checkout preservado quando não logado ou com token expirado (`getOptionalAuthUserId` retorna `null`); `user.phone` vazio tratado com segurança em `StorePage.tsx`; `GET /api/orders/mine` declarada antes de `GET /api/orders/track/:trackingCode` para evitar colisão de rota; regra `1-C` resolvida sem cascata via `_count` no login/me.
- **Apontamentos (se houver):**
  - _Ciclo 1:_ Nenhum bloqueio.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:**
  - `GET /api/orders/mine` com `requireAuth`, ownership estrito (`userId: req.user!.id`), `select` enxuto (sem `pixKey`, `deliveryAddress`, `notes`, `customerPhone` ou `whatsapp`) e `Cache-Control: no-store`.
  - `POST /api/store/:slug/orders` com `getOptionalAuthUserId` e validação do `userId` no banco antes de persistir a FK (`null` para visitante ou token inválido).
  - `AuthPage.tsx` com anti-open-redirect preservado e regra `1-C` via `_count`.
  - `StorePage.tsx` com pré-preenchimento seguro (`user.phone` opcional) e guest checkout 100% preservado.
  - Ordem de rotas Express validada (`/orders/mine` antes de `/orders/track/:trackingCode`); `noindex: true` em `/meus-pedidos`; zero `console.log`.
- **Veredito:** `APROVADO`
- **Apontamentos (se houver):**
  - _Ciclo 1:_ 2 observações menores não-bloqueantes (`cursor-pointer` em `MyOrdersPage.tsx` e `/meus-pedidos` em `isPrivatePathname` de `api.ts`) já aplicadas e rebuild validado.
  - _Auditoria AppSec & LGPD (Pente Fino):_ 3 melhorias aplicadas e validadas: `myOrdersRateLimiter` (`60 req/15 min`) em `GET /api/orders/mine` (`order.routes.ts`), refresh silencioso preventivo em `createStoreOrder` (`api.ts`) quando o `accessToken` expirou, e limpeza de estado/PII ao deslogar em `StorePage.tsx` e `MyOrdersPage.tsx`.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. **Guest Checkout:** Abrir uma vitrine (`/c/:slug`) deslogado, adicionar item ao carrinho, abrir checkout, verificar o atalho discreto "Entrar / Criar conta" e concluir um pedido como visitante normalmente.
2. **Compra Logada + Pré-preenchimento:** Entrar com uma conta em `/entrar?redirect=/c/:slug`, voltar à vitrine, verificar o link discreto `Meus Pedidos` no topo da vitrine e confirmar nome/WhatsApp pré-preenchidos no checkout ao fazer um pedido.
3. **Tela Meus Pedidos (`/meus-pedidos`):** Acessar `/meus-pedidos` (ou fazer login com uma conta que tem 0 vitrines e >= 1 pedido para testar o redirect automático `1-C`), conferir a lista cronológica e clicar em "Acompanhar pedido" (`/pedido/:trackingCode`).
4. **Super Admin:** Acessar `/super-admin` e conferir no card de Usuários o detalhamento `{usersWithCatalogs} com vitrine • {buyersOnly} apenas compradores`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `[Optional Auth + FK]` Em rotas híbridas (guest + logado) como `POST /api/store/:slug/orders`, validar o `userId` opcional no banco antes de persistir a FK (fallback para `null`) evita erro 500 caso o JWT pertença a uma conta removida.
