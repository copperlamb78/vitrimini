# Memória de Longo Prazo — Lições Aprendidas (VitriMini)

> **Regras:** 1–2 linhas por lição (`[Causa/Armadilha] → [Regra obrigatória para evitar]`). Nunca registrar erros triviais (typo/import). **Teto: 50 lições** (se passar, o `orchestrator` consolida/remove obsoletas antes de adicionar).

## UI / UX & Design System
- `[Tema Dinâmico]` → Nunca usar preto fixo (`bg-zinc-900`/`#18181B`) em abas, filtros ou seletores ativos do painel do lojista; sempre seguir dinamicamente a cor do tema da vitrine.
- `[Interatividade]` → Todo elemento clicável (botões, links, cards, abas, pills, toggles) deve ter `cursor-pointer` (e `cursor-not-allowed` quando desabilitado).
- `[Polling + Skeleton]` → Skeleton Loaders só aparecem na carga inicial ou troca de rota; **nunca** exibir skeleton durante polling silencioso (15s/20s) para não fazer a tela piscar.
- `[Web Audio API]` → Sempre tornar o disparo de som `async` e dar `await ctx.resume()` se `ctx.state === 'suspended'` antes de iniciar os osciladores, desbloqueando o áudio na interação do usuário.
- `[UX Writing / Zero Jargão]` → Nunca usar jargão técnico (*logado, login, slug, URL, token, autenticação, sessão expirada, upload, MIME, tracking*) em textos ou erros voltados a compradores e lojistas; usar linguagem natural (`na sua conta`, `entrar`, `link da vitrine`, `envio da foto`, `sua conexão expirou, entre novamente`, `código do pedido`), exceto no Super Admin e logs internos.

## Autenticação, Sessão & Segurança (AppSec / LGPD)
- `[Sessão / Falso Logado]` → Nunca renderizar nome do usuário ou atalhos de logado confiando apenas no `localStorage`; validar primeiro com `GET /api/auth/me` (ou refresh silencioso) e limpar sessão globalmente em `401`.
- `[Refresh Token + CORS]` → Cookies `HttpOnly` exigem `credentials: true` com lista explícita de origens no CORS (nunca `*`) e `Domain=.vitrimini.com.br` em produção para funcionar no Safari/iOS.
- `[LGPD / Tracking Público]` → `GET /api/orders/track/:trackingCode` nunca pode retornar telefone ou endereço do comprador.
- `[Optional Auth + Refresh]` → Rotas híbridas (guest + logado) não retornam `401` para token expirado; no front-end, checar `isJwtTokenExpired` e renovar via `refreshAuthSession()` antes da chamada, e no back-end validar a existência do `userId` opcional antes de gravar FK.
- `[Logout / Dispositivo Compartilhado]` → Ao deslogar (`user` vai para `null`), limpar imediatamente campos auto-preenchidos (`customerName`, `customerPhone`) e estados de listas privadas (`orders`).

## Back-end, Prisma & Banco de Dados
- `[Isolamento de Banco]` → Ambiente local só pode apontar para `vitrimini-dev`; nunca rodar `prisma db push` ou testes contra produção.

## Performance, Polling & Infra (Render / Supabase / Cloudflare / Brevo)
- `[Rate-Limit + Polling]` → Ao aplicar `rateLimit` em rotas com polling (ex.: `OrderTrackingPage` a cada 20s = 45 req/15 min), dimensionar folga para múltiplos usuários no mesmo Wi-Fi (ex.: `120 req/15 min`) e limpar `Map`s de cooldown on-access para evitar vazamento de memória no Render.

## Regras de Negócio VitriMini
- `[Retirada vs. Entrega]` → Pedidos `PICKUP` têm 3 etapas (`Recebido` → `Em preparo` → `Pronto p/ retirada`) e nunca podem ir para `OUT_FOR_DELIVERY`.
