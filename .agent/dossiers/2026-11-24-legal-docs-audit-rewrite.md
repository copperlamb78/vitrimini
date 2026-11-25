# Dossiê da Tarefa: Reescrita Jurídica Auditada (Termos + DPA & Política de Privacidade LGPD/ANPD)

- **Data:** 2026-11-24
- **Tamanho:** `M` (Documentação jurídica em `legalDocs.ts` + espelho de prerender se aplicável — zero alterações de banco/API)
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Reescrever os Termos de Uso (com Quadro de Identificação do Fornecedor Decreto 7.962/2013 e Anexo DPA) e a Política de Privacidade (LGPD, ANPD Res. 2/2022, 15/2024 e 19/2024) em `frontend/src/data/legalDocs.ts`, alinhados 100% ao comportamento técnico real da plataforma em 24/11/2026 (contratação avulsa por ciclo, upgrade com soma de dias, zero armazenamento de cartão/PCI-DSS próprio, inventário exato de cookies/storage e suboperadores).

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Especificação completa fornecida pelo usuário na solicitação (Seções A e B).

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Contratos (`legalDocs.ts`):** Preservar `LegalDocument` e `LEGAL_DOCS`; estender `LegalSection` com `table?: { headers: string[]; rows: string[][] }` opcional e renderizar em `LegalDocPage.tsx` com `overflow-x-auto`.
- **Regra de Ouro:** Tempo presente declarativo refletindo a operação real em 24/11/2026 (contratação avulsa por ciclo, zero recorrência automática, upgrade somando dias restantes, zero PCI-DSS próprio e inventário exato de cookies/storage).
- **Alinhamento (`prerender.mjs`):** Espelhar resumos de `/termos` e `/privacidade` sem menção a `"recorrente"`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado` (`N/A` — zero alterações de banco, schema ou queries).

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado` — zero novos pacotes, zero impacto relevante no bundle e zero custos extras.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-legal-audit` | `frontend/src/data/legalDocs.ts`, `frontend/src/pages/LegalDocPage.tsx`, `frontend/scripts/prerender.mjs` | Reescritos Termos (+ Quadro Decreto 7.962/2013 e Anexo DPA) e Privacidade (LGPD, ANPD Res. 2/2022, 15/2024 e 19/2024, cookies/storage exatos, delimitação PCI-DSS, tabela de suboperadores), suporte a `section.table` em `LegalDocPage.tsx` e resumos em `prerender.mjs` | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Veredito:** `APROVADO`
- **Build (`frontend/`):** `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`) executado com exit code `0` (1692 módulos transformados em 10.86s).
- **Auditoria de conteúdo (`legalDocs.ts` e blocos `/termos` e `/privacidade` de `prerender.mjs`):**
  - Zero ocorrências de `"vai ter"`, `"será implementado"`, `"em breve"`, `"futuramente"` e `"desde que não haja fraude"`.
  - Zero menção a cobrança/assinatura recorrente ativa (apenas negativas explícitas em `legalDocs.ts`: *"não realiza renovação automática nem débito automático recorrente"* e *"não há assinatura recorrente a cancelar"*).
  - Presença exata das chaves `vitrimini_refresh_token`, `mp_oauth_nonce`, `vitrimini_has_session`, `vitrimini_draft_v1`, `vitrimini_order_sound`, `vitrimini_mp_invite_dismissed_<catalogId>` e do e-mail `suporte@vitrimini.com.br` (zero `contato@vitrimini.com.br`).
- **Pré-renderização & Responsividade:** `frontend/dist/termos/index.html` (8535 bytes) e `frontend/dist/privacidade/index.html` (7940 bytes) gerados; `LegalDocPage.tsx` renderiza `section.table` dentro de contêiner com `overflow-x-auto`.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **Termos de Uso + DPA (`LEGAL_DOCS.terms`):** Quadro do Fornecedor conforme Decreto nº 7.962/2013 (art. 2º) com campos explícitos de CPF e endereço para conferência do titular antes do deploy; distinção Lojista vs. Comprador; Código Civil, Marco Civil e CDC; idade mínima (capacidade civil plena); avaliação gratuita de 15 dias sem cartão; contratação avulsa por ciclo (sem recorrência/renovação automática); upgrade somando integralmente os dias restantes; exclusão após 30 dias no R2 com ressalvas do art. 16 da LGPD e ciclos de backup; direito de arrependimento (art. 49 do CDC) sem restrição condicionante e preservando tempestividade em finais de semana/feriados; 0% de comissão com repasse 100% direto ao Lojista e sem exoneração absoluta (art. 51 do CDC); foro de Feira de Santana/BA com ressalva ao domicílio do consumidor; e Anexo DPA completo.
- **Política de Privacidade (`LEGAL_DOCS.privacy`):** Matriz Controladora/Operadora delimitada; enquadramento como agente de pequeno porte (Res. CD/ANPD nº 2/2022) com canal `suporte@vitrimini.com.br`; bases legais do art. 7º da LGPD; declaração explícita de ausência de tabela de logs históricos IP+data/hora no banco; controles reais (`bcrypt`, `SHA-256`, `AES-256-GCM`, cookies `HttpOnly`); delimitação expressa de ausência de certificação PCI-DSS própria e não armazenamento de cartão/CVV; inventário exato de cookies/storage/carrinho em memória/zero analytics; tabela dos 6 suboperadores com referência à Res. CD/ANPD nº 19/2024; direitos do art. 18 (15 dias) e incidentes conforme Res. CD/ANPD nº 15/2024; `updatedAt: '24 de novembro de 2026'`.
- **UI & Prerender:** `LegalDocPage.tsx` renderiza `section.table` com `overflow-x-auto`, `scope="col"` e tokens do Design System; `frontend/scripts/prerender.mjs` (`/termos` e `/privacidade`) está alinhado com `legalDocs.ts`.
- **Nota pré-deploy (para o titular):** Preencher os placeholders `[CPF: preencher antes do deploy]` e `[Endereço comercial/correspondência: ...]` em `frontend/src/data/legalDocs.ts` antes de publicar em produção.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o frontend (`cd frontend && npm run dev`) e acesse `/termos` e `/privacidade` em `360px` e desktop.
2. Em `/termos`, confira o Quadro de Identificação do Fornecedor (e preencha `[CPF: preencher antes do deploy]` e `[Endereço comercial/correspondência: ...]`), a regra de upgrade somando dias, contratação avulsa sem recorrência, arrependimento Art. 49 CDC sem restrições condicionantes e o Anexo DPA.
3. Em `/privacidade`, confira a matriz Controladora/Operadora, enquadramento ANPD Res. 2/2022, delimitação PCI-DSS, inventário exato de cookies/`localStorage`/`sessionStorage`, tabela responsiva dos 6 suboperadores (Res. 19/2024) e comunicação de incidentes (Res. 15/2024).

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
