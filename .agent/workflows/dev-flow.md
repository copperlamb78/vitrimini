---
description: Fluxo multiagente completo da VitriMini (/dev-flow) com Dossiê Incremental por Tarefa — Triagem, Comitê, Aprovação, Mapa de Arquivos, Developers, QA, Reviewer e Guia de Teste Local.
---

# `/dev-flow` — Pipeline Multiagente VitriMini

> Este workflow espelha a skill oficial em `.agent/skills/dev-flow/SKILL.md`. Siga estritamente o pipeline abaixo no papel de `orchestrator` (`.agent/agents/orchestrator.md`):

`Portão (Modo Direto ou Fluxo) → Triagem (P/M/G) & Dossiê → Comitê (se M/G) → Perguntas simples & Aprovação → Mapa de Arquivos → Developers (1 ou paralelo) → QA → Reviewer → Guia Rápido de Teste Local`

0. **Portão de Entrada (Economia de Tokens):** Se a demanda for trivial e localizada (CSS, texto/copy, typo/import em 1–2 arquivos, docs/config) sem pedido de *"force o fluxo completo"*, faça **auto-downgrade** para **Modo Direto** (`[Modo Direto • Hydrogen — sem dossiê para economizar tokens]`), edite direto, rode `npm run build` apenas no pacote afetado e responda em 2–3 linhas. Se exigir banco, API, auth ou lógica estrutural, faça **auto-escalonamento** para a Etapa 1.
1. **Triagem & Dossiê:** Consulte `.agent/memory/lessons-learned.md`, classifique (`P`/`M`/`G`) e crie `.agent/dossiers/YYYY-MM-DD-<slug-da-tarefa>.md` a partir de `.agent/templates/dossier-template.md`.
2. **Comitê (`M`/`G`):** `principal-engineer` (Seção 2), `dba-frugal` (Seção 3) e `finops` (Seção 4) leem e preenchem suas seções.
3. **Checkpoint (`M`/`G`):** Apenas se exigir raciocínio pesado (`G`, arquitetura crítica, AppSec/LGPD ou refatoração complexa), inclua `[Sugestão de modelo: Neon — se quiser trocar, faça agora antes do OK; senão sigo inteiro no modelo atual]`. Apresente plano curto + 3–5 perguntas objetivas. Aguarde o `"OK"` do usuário e registre na **Seção 1** (depois rode o resto sem pausas para troca de modelo).
4. **Mapa de Arquivos:** Preencha os arquivos permitidos na **Seção 5**.
5. **Developers:** Leem o dossiê, codam apenas seus arquivos e atualizam sua linha na **Seção 5**.
6. **QA:** Lê o dossiê, valida builds (`/backend` e `/frontend`) + edge cases e preenche a **Seção 6**.
7. **Reviewer:** **Proibido** dar `APROVADO` se a **Seção 6 (`qa`)** não estiver preenchida com os builds validados. Lê o dossiê, audita Auth/LGPD/AppSec/Design System e preenche a **Seção 7**.
8. **Circuit Breaker:** Máximo de **2 ciclos** (`Ciclo 1`, `Ciclo 2` sem apagar histórico). Na 3ª falha, pare e escale para o usuário.
9. **Entrega & Memória:** **Proibido** marcar `Pronto para Teste Local` sem a **Seção 6 (`qa`)** preenchida e `APROVADO`. Se houve retrabalho (QA/Review), bug sutil ou correção do usuário, `reviewer`/`orchestrator` preenche a **Seção 9** e promove a lição para `.agent/memory/lessons-learned.md` (teto: 50 lições). Preencha a **Seção 8 (Guia Rápido de Teste Local)**. Garanta ausência de segredos/dados reais (pois `.agent/dossiers/` e `lessons-learned.md` são versionados no Git) e entregue o resumo final (sem `git push`).
