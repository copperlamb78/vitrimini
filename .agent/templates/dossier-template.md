# Dossiê da Tarefa: <Título Curto da Tarefa>

- **Data:** YYYY-MM-DD
- **Tamanho:** `P` | `M` | `G`
- **Status Atual:** `Triagem` | `Aguardando Aprovação` | `Em Desenvolvimento` | `QA` | `Review` | `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> _2 a 3 linhas explicando o que será feito e por quê, sem jargão técnico excessivo._

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1:** ... → **Resposta:** ...
- *(Em tarefas `P` sem perguntas: `N/A`)*

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** ...
- **Endpoints / Payloads Zod / Tipos TS:** ...
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** _Citar em 1 linha qual pegadinha está sendo evitada (ou `Nenhuma`)._
- **Fora de escopo:** ...

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado` | `Com ressalvas` | `Vetado` | `N/A`
- **Schema & Índices (`@@index`):** ...
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** ...

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado` | `Com ressalvas` | `Vetado` | `N/A`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:** ...

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend` | `...` | _Pendente_ | `Pendente` |
| `dev-frontend` | `...` | _Pendente_ | `Pendente` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/backend` (`...`) | `/frontend` (`...`) | `prisma generate` (`...`)
- **Edge cases:** Mobile/WhatsApp (`...`), `America/Sao_Paulo` (`...`), estados vazios (`...`), polling sem piscar (`...`), tema dinâmico (`...`), retrocompatibilidade (`...`)
- **Apontamentos (se houver):**
  - _Ciclo 1:_ ...

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:** Auth/ownership (`...`) | LGPD rotas públicas (`...`) | Sanitização/Open-Redirect (`...`) | Ordem rotas Express (`...`) | Tema dinâmico & `cursor-pointer` (`...`)
- **Veredito:** `APROVADO` | `REPROVADO`
- **Apontamentos (se houver):**
  - _Ciclo 1:_ ...

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. ...
2. ...
3. ...

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Sim` | `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `[Causa/Armadilha]` → `[Regra obrigatória para evitar]` *(promovida para `.agent/memory/lessons-learned.md`? `Sim` | `N/A`)*
