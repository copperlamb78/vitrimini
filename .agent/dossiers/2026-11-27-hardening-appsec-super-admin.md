# Dossiê da Tarefa: Hardening AppSec Pós-Auditoria (Super Admin & Rotas Públicas)

- **Data:** 2026-11-27
- **Tamanho:** `M`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Correção dos 3 achados médios e 2 baixos identificados na auditoria AppSec: bloqueio de URLs protocol-relative em avisos globais, preservação da sessão do Super Admin ao clicar em Sair durante Modo Suporte, teto de registros `OPEN` e purge de 60 dias para telemetria frontend, redução de enumeração em cupons públicos e máscara de CPF/CNPJ nos logs.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Usuário aprovou explicitamente a aplicação dos 5 itens da auditoria AppSec mantendo KISS e padrão `fix(security): ...` com 1 commit por arquivo.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Ajustes pontuais nos validadores Zod, `GlobalAnnouncementBanner`, `AuthContext`, `errorLog.service`, `publicGrowth.routes`, `adminGrowth.service` e `redact.ts`, sem novas dependências.
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[Sessão / Falso Logado]` e `[Rate-Limit + Polling]`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Queries & Retenção:** `prisma.systemErrorLog.count({ where: { source: 'FRONTEND', status: 'OPEN' } })` usa índice `[source, severity]`/`[status, lastSeenAt]`; purge `deleteMany` acoplado ao `purgeOldObservabilityLogs()` existente.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Supabase / Render:** Teto de `500` registros `FRONTEND` `OPEN` protege banco e RAM contra flood.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-security` | `backend/src/utils/adminValidation.ts`, `frontend/src/components/GlobalAnnouncementBanner.tsx`, `frontend/src/contexts/AuthContext.tsx`, `backend/src/services/errorLog.service.ts`, `backend/src/routes/publicGrowth.routes.ts`, `backend/src/services/adminGrowth.service.ts`, `backend/src/utils/redact.ts` | Aplicadas todas as 5 correções AppSec | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/backend` (`exit code 0` via `prisma generate && tsc`) | `/frontend` (`exit code 0` via `tsc -b && vite build && prerender`)

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO` (todos os 3 achados médios e 2 baixos corrigidos seguindo KISS)

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Testar criação de aviso com `ctaUrl: "//evil.com"` (deve retornar `400`).
2. Testar clicar em "Sair" durante Modo Suporte (deve retornar ao Admin sem deslogar o Admin).

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
