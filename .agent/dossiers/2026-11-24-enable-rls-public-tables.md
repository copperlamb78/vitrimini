# Dossiê da Tarefa: Habilitar RLS em Todas as Tabelas do Schema Public (`rls_disabled_in_public`)

- **Data:** 2026-11-24
- **Tamanho:** `P` (Segurança/Banco — Migration SQL idempotente sem alteração de models)
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Corrigir o alerta crítico `rls_disabled_in_public` do Supabase Security Advisor ativando Row-Level Security (RLS) em todas as tabelas do schema `public` via migration SQL idempotente do Prisma, bloqueando acesso público via PostgREST/`anon key` (efeito *default-deny*) sem impactar o acesso do backend Express + Prisma.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Escopo e SQL base definidos explicitamente pelo usuário na solicitação.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Migration SQL pura e idempotente (`ENABLE ROW LEVEL SECURITY` nas tabelas do schema `public`), sem novas dependências nem policies permissivas (*default-deny* na Data API pública).
- **Zero Dependência Supabase/PostgREST:** Varredura confirmou zero uso de `@supabase/supabase-js` ou `anon_key` no front e back.
- **Fora de escopo:** Criar policies `authenticated`/`anon` ou alterar models do `schema.prisma`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Schema & Índices:** Zero alterações em `backend/prisma/schema.prisma`.
- **SQL & Histórico Prisma:** Bloco `DO $$ ... pg_tables WHERE schemaname = 'public' ... ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY; $$` é idempotente e não destrutivo. Como o projeto usava `prisma db push`, aplicar via `npx prisma migrate deploy` (nunca `migrate dev --reset` / shadow DB destrutivo) no banco de dev (`NODE_ENV=development`).

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Supabase / Render / Brevo / Cloudflare:** Custo zero e latência zero (role `postgres` possui `BYPASSRLS`). Zero pacotes ou cron jobs adicionados.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-rls` | `backend/prisma/migrations/20261124175500_enable_rls_public_tables/migration.sql` | Criada migration SQL idempotente; registrada via `migrate resolve --applied` e aplicada em dev via `prisma db execute`; todas as 9 tabelas `public` com `rowsecurity: true` | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Veredito:** `APROVADO`
- **`npx prisma validate`** (em `backend/`): `The schema at prisma\schema.prisma is valid 🚀` (exit code 0).
- **`npx prisma generate`** (em `backend/`): `✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 110ms` (exit code 0).
- **`npm run build`** (em `backend/`): `prisma generate && tsc` concluído sem erros (exit code 0).
- **`npx prisma migrate status`** (em `backend/`): `1 migration found in prisma/migrations` — `Database schema is up to date!` (exit code 0).
- **`git diff backend/prisma/schema.prisma`**: Sem saída (exit code 0) — `schema.prisma` não foi alterado.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **SQL & AppSec (RLS):** `migration.sql` é idempotente (`DO $$` + `pg_tables` com `schemaname = 'public'` e `format('... %I ...', r.tablename)`), habilita `ENABLE ROW LEVEL SECURITY` em todas as tabelas do schema `public` e não cria policies permissivas — garantindo *default-deny* para `anon` e `authenticated` na Data API (PostgREST) sem afetar o backend Express + Prisma (`postgres` / `BYPASSRLS`).
- **Integridade & Segredos:** `git status` confirma `backend/prisma/schema.prisma` intacto (apenas `backend/prisma/migrations/` adicionado). Nenhum segredo, URL de conexão, credencial ou dado pessoal foi exposto no dossiê ou na migration.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. **Dev (já aplicado):** `backend/.env` (`NODE_ENV=development`) já teve a migration aplicada; todas as 9 tabelas (`Catalog`, `CatalogPayment`, `EmailLog`, `Order`, `OrderItem`, `Product`, `RefreshToken`, `User`, `_prisma_migrations`) estão com `rowsecurity = true`.
2. **Produção (pendente de aplicação controlada):** como o banco de produção também usava `prisma db push` (sem `_prisma_migrations`), aplicar via `npx prisma migrate resolve --applied 20261124175500_enable_rls_public_tables` seguido de `npx prisma db execute --file prisma/migrations/20261124175500_enable_rls_public_tables/migration.sql --schema prisma/schema.prisma` (ou rodar o bloco SQL no SQL Editor do Supabase + `migrate resolve --applied`).
3. **Painel Supabase:** remover `public` de *Exposed Schemas* em *Project Settings → Data API* e clicar em *Refresh* no *Security Advisor*.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
