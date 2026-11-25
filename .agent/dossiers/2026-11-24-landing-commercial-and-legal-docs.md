# Dossiê da Tarefa: Atualização Comercial da Home (`/`) e Reescrita Jurídica (Termos & Privacidade)

- **Data:** 2026-11-24
- **Tamanho:** `M` (Frontend Copywriting, SEO & Documentos Legais — sem alteração de banco/API)
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Remover promessas comerciais incompatíveis com o modelo atual de assinaturas/cartão (`"sem cartão"`, `"sem cobrança automática"`, `"sem mensalidade"`, `"sem renovação automática"`, `"Pix único"`) na Home (`/`), FAQ e páginas associadas, e reescrever os Termos de Uso e a Política de Privacidade em `legalDocs.ts` no tempo presente (Código Civil, CDC, Marco Civil e LGPD, incluindo recorrência, PCI-DSS via Mercado Pago e VitriLink).

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Especificação completa fornecida pelo usuário na solicitação (itens A, B e C).

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Escopo KISS:** Alteração estrita de copywriting comercial, SEO/prerender e documentos legais estáticos no `/frontend` (sem alterações de backend, rotas ou banco).
- **Preservação de `legalDocs.ts`:** Manter intactas `LegalSection`, `LegalDocument` e `LEGAL_DOCS` para `LegalDocPage.tsx` e `scripts/prerender.mjs` renderizarem `/termos` e `/privacidade`.
- **Regra de Ouro Jurídica:** Redação declarativa no tempo presente (Código Civil, CDC, Marco Civil, LGPD, recorrência, PCI-DSS via Mercado Pago e VitriLink), sem promessas futuras (`"vai ter"`, `"em breve"`).
- **Alinhamento SEO/Prerender:** Espelhar remoção de `"sem cartão"`, `"sem cobrança automática"`, `"sem mensalidade"` e `"sem renovação automática"` em `index.html` e `scripts/prerender.mjs`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado` (`N/A` — zero migrations ou alterações de schema/queries).

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado` — zero novos pacotes, zero impacto relevante no bundle e zero custos extras.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-commercial` | `frontend/src/pages/LandingPage.tsx`, `frontend/src/data/landingFaq.ts`, `frontend/src/components/Footer.tsx`, `frontend/src/pages/CreatorPage.tsx`, `frontend/src/data/nichePages.ts`, `frontend/index.html`, `frontend/scripts/prerender.mjs` | Removidas todas as menções a `"sem cartão"`, `"sem cobrança automática"`, `"sem mensalidade"`, `"sem renovação automática"` e `"Pix único"`, alinhando copy, FAQ, SEO e prerender ao modelo atual | `Concluído` |
| `dev-legal` | `frontend/src/data/legalDocs.ts` | Reescrita completa dos Termos de Uso e Política de Privacidade no tempo presente (Código Civil, CDC, Marco Civil, LGPD, recorrência, PCI-DSS via Mercado Pago e VitriLink; `updatedAt: 24 de novembro de 2026`) | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Veredito:** `APROVADO`
- **Build & Prerender (`frontend/`):** `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`) executado com `exit code 0` (1692 módulos transformados; `dist/` gerado em 7.82s).
- **Varredura de termos comerciais proibidos (`frontend/src/**`, `frontend/index.html`, `frontend/scripts/prerender.mjs`):** Busca case-insensitive por `"sem cartão"`, `"sem cobrança automática"`, `"sem mensalidade"`, `"sem renovação automática"` e `"Pix único"` retornou **0 ocorrências**.
- **Varredura de tempo futuro em documentos legais (`frontend/src/data/legalDocs.ts`):** Busca case-insensitive por `"vai ter"`, `"será implementado"`, `"em breve"` e `"futuramente"` retornou **0 ocorrências**.
- **Rotas legais, prerender & responsividade:**
  - `/termos` e `/privacidade` seguem ligadas a `LegalDocPage.tsx` em `frontend/src/App.tsx` e pré-renderizadas em `frontend/dist/termos/index.html` (8230 bytes) e `frontend/dist/privacidade/index.html` (7475 bytes).
  - `frontend/src/pages/LandingPage.tsx` mantém layout mobile-first (`grid-cols-1`, `min-w-0` e breakpoints `sm:`/`md:`/`lg:`) compatível com `360px`+.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **Termos de Uso & Política de Privacidade (`frontend/src/data/legalDocs.ts`):**
  - Redação declarativa integralmente no tempo presente (0 ocorrências de promessas futuras) e `updatedAt: '24 de novembro de 2026'` em `terms` e `privacy`.
  - Aderência verificada ao Código Civil (Lei nº 10.406/2002), CDC (Lei nº 8.078/1990, incluindo Art. 49 — arrependimento em 7 dias corridos), Marco Civil da Internet (Lei nº 12.965/2014) e LGPD (Lei nº 13.709/2018: distinção Controladora vs. Operadora, bases legais, retenção/carência de 30 dias, direitos do Art. 18 e canal oficial/DPO `contato@vitrimini.com.br`).
  - Cláusula explícita PCI-DSS (não armazena número completo de cartão, CVV ou senhas bancárias; processamento tokenizado no Mercado Pago e tokens OAuth com AES-256-GCM), cobertura de recorrência/cartão/Pix, VitriLink e integração Mercado Pago.
- **Alinhamento Comercial (`LandingPage.tsx`, `landingFaq.ts`, `Footer.tsx`, `CreatorPage.tsx`, `nichePages.ts`, `index.html`, `prerender.mjs`):**
  - Varredura confirmou 0 ocorrências de promessas antigas (`"sem cartão"`, `"sem cobrança automática"`, `"sem mensalidade"`, `"sem renovação automática"`, `"Pix único"`, `"pagamento único"`, `"uma única vez"`).
  - Copy comercial, FAQ, metadados SEO e HTML pré-renderizado coerentes entre SPA e `prerender.mjs`.
- **Aderência a `lessons-learned.md`:** Sem desvios de LGPD, AppSec ou copywriting; Seção 6 (`qa`) previamente `APROVADO`.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o frontend (`cd frontend && npm run dev`) e acesse `/` em `360px` e desktop.
2. Confirme que Hero, Planos, FAQ, Footer e `/criar` não exibem `"sem cartão"`, `"sem cobrança automática"`, `"sem mensalidade"`, `"sem renovação automática"` ou `"Pix único"`.
3. Acesse `/termos` e `/privacidade` pelo rodapé e confirme a vigência (`24 de novembro de 2026`), redação no tempo presente, cláusulas de recorrência/CDC Art. 49, PCI-DSS (Mercado Pago), VitriLink e LGPD (Controladora vs. Operadora e Art. 18).

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
