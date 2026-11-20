---
name: dev-flow
description: Executa o fluxo multiagente completo da VitriMini (/dev-flow) passando por Triagem (P/M/G), Comitê (Principal, DBA Frugal, FinOps), Aprovação, Mapa de Arquivos, Developers em paralelo, QA e Reviewer, mantendo um Dossiê Incremental por tarefa.
---

# Workflow Principal: `/dev-flow` (VitriMini)

Ao ser acionado (via `/dev-flow <descrição da demanda>`), assuma o papel do **`orchestrator`** (`.agent/agents/orchestrator.md`) e execute **exatamente** este pipeline:

## Etapa 0 — Portão de Entrada (Economia de Tokens)
- **Auto-downgrade:** Se a demanda for trivial e localizada (CSS/cor/ícone, texto/copy, typo/import em 1–2 arquivos sem regra de negócio, docs/config) e o usuário não tiver pedido *"force o fluxo completo"*, **não crie dossiê nem subagentes**:
  1. Avise em 1 linha: `[Modo Direto • Hydrogen — sem dossiê para economizar tokens]`.
  2. Aplique direto respeitando `.agent/rules/vitrimini-core.md` e `.agent/memory/lessons-learned.md`, rode `npm run build` no pacote afetado e responda em 2–3 linhas.
- Caso envolva lógica de negócio, estrutura, banco, auth/LGPD, integrações/cotas ou bug complexo (ou se houver **auto-escalonamento**), siga para a Etapa 1.

## Etapa 1 — Triagem (`P` / `M` / `G`) & Criação do Dossiê
- Leia os arquivos estritamente necessários e consulte `.agent/memory/lessons-learned.md` (leitura preventiva).
- Classifique a demanda em **P**, **M** ou **G**.
- Crie `.agent/dossiers/YYYY-MM-DD-<slug-da-tarefa>.md` copiando `.agent/templates/dossier-template.md` e preencha o **Cabeçalho** (com Status `Triagem` e Resumo Executivo).
  - Em tarefas `P`, marque as seções `1`, `2`, `3` e `4` como `N/A`.

## Etapa 2 — Comitê Técnico *(apenas se `M` ou `G`)*
- Cada membro lê o dossiê e preenche **apenas sua seção**:
  1. `principal-engineer` → **Seção 2** (KISS, contrato Zod/TS, fora de escopo).
  2. `dba-frugal` → **Seção 3** (`@@index`, zero N+1, `select` enxuto, `P2002`, `vitrimini-dev`).
  3. `finops` → **Seção 4** (Brevo 300/dia, Render/Supabase, Cloudflare, polling `visibilityState`).
- Se houver veto, ajuste a proposta antes de seguir.

## Etapa 3 — Perguntas Simples & Aprovação *(Checkpoint Obrigatório em `M`/`G`)*
- Atualize o Status do dossiê para `Aguardando Aprovação`.
- Apenas se a tarefa exigir raciocínio pesado (`G`, arquitetura crítica, AppSec/LGPD ou refatoração estrutural complexa), inclua **uma única recomendação** antes das perguntas:
  `[Sugestão de modelo: Neon — se quiser trocar, faça agora antes do OK; senão sigo inteiro no modelo atual]`
- Apresente um plano curto em tópicos + **no máximo 3 a 5 perguntas simples, diretas e objetivas** (preferencialmente múltipla escolha, sem textão).
- **Pare e aguarde o `"OK"` do usuário** antes de iniciar qualquer `developer`. Após o `"OK"`, rode o restante do pipeline continuamente sem pedir troca de modelo.
- Ao receber as respostas, registre-as na **Seção 1** do dossiê. *(Em `P` sem ambiguidade, pule direto para a Etapa 4).*

## Etapa 4 — Mapa de Arquivos & Contrato
- Defina na **Seção 5** do dossiê:
  - Quantos subagentes `developer` subir (`1` para `P`; `1–3` em paralelo para `M`/`G`).
  - Arquivos permitidos por `developer` (**zero conflito**).
- Atualize Status para `Em Desenvolvimento`.

## Etapa 5 — Execução (`Developers`)
- Cada `developer` lê o dossiê, implementa seus arquivos e atualiza **apenas sua linha na Seção 5**.
- Opere em **modo autônomo** (só interrompa o usuário se surgir decisão crítica impossível de inferir).

## Etapa 6 — QA (`qa`)
- Atualize Status para `QA`. O `qa` lê o dossiê, executa `npx prisma generate` (se alterou schema), `npm run build` em `/backend` e `/frontend` (exit code 0) e valida edge cases, preenchendo a **Seção 6**.

## Etapa 7 — Review (`reviewer`)
- **Trava obrigatória:** O `reviewer` **só pode** iniciar e dar `APROVADO` após a **Seção 6 (`qa`)** estar preenchida com os builds validados.
- Atualize Status para `Review`.
- O `reviewer` lê o dossiê, audita Auth, LGPD, AppSec, rotas Express e Design System, e preenche a **Seção 7**.

## Etapa 8 — Circuit Breaker (Máximo 2 Ciclos)
- Se `qa` ou `reviewer` reprovar, registra `Ciclo 1` (ou `Ciclo 2`) na sua seção, incrementa o contador no Cabeçalho (`1/2`, `2/2`) e devolve ao `developer`.
- Se falhar na **3ª tentativa**, **pare e escale para o usuário** com diagnóstico curto.

## Etapa 9 — Resumo Final para Teste Local & Memória
- **Trava obrigatória:** É **proibido** marcar o dossiê como `Pronto para Teste Local` se a **Seção 6 (`qa`)** não estiver preenchida com os builds validados e `APROVADO`.
- Se houve retrabalho (QA/Review), bug sutil ou correção do usuário, `reviewer`/`orchestrator` preenche a **Seção 9** e promove a lição (1–2 linhas, sem erros triviais) para `.agent/memory/lessons-learned.md` (consolidando se passar de 50 lições).
- Atualize Status do dossiê para `Pronto para Teste Local` e preencha a **Seção 8 (Guia Rápido de Teste Local)**.
- Garanta que o dossiê e as lições não contenham segredos de `.env`, tokens ou dados pessoais reais (pois `.agent/dossiers/` e `.agent/memory/lessons-learned.md` são versionados no Git).
- Entregue ao usuário um resumo enxuto com o link do dossiê, arquivos alterados, resultado dos builds e passos para teste local (sem `git push`).
