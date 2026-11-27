# Dossiê da Tarefa: OG Image, Credibilidade, Prova Visual, Posicionamento e SEO Nichos

- **Data:** 2026-11-26
- **Tamanho:** `G`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Resolver 5 frentes de conversão, marca e SEO no `/frontend`: (1) gerar nova `og-image.png` (`1200x630`, sem menção a trimestral, paleta rosa-coral/azul escuro, sem amarelo) com cache-busting `?v=20261126`; (2) centralizar dados institucionais (`siteConfig.ts`) com CNPJ, suporte WhatsApp e redes sociais no `Footer.tsx`, faixa de confiança na Home e JSON-LD `Organization`; (3) adicionar CTA duplo no Hero (`DemoStoreModal.tsx`) e seção interativa "Veja na prática" (`Visão do Cliente` vs. `Painel do Lojista`); (4) posicionar os 4 diferenciais de encomendas/turnos/sinal Pix/VitriLink; (5) tornar 100% único o conteúdo de cada página de nicho (`nichePages.ts`) e atualizar `prerender.mjs` + `sitemap.xml`.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1 (CNPJ / Razão Social):** Ainda não possui CNPJ → **Resposta:** Não inventar CNPJ; exibir marca `VitriMini` + plataforma segura e deixar campo `documentNumber?: string` opcional em `siteConfig.ts` pronto para preenchimento futuro.
- **Pergunta 2 (Cidade / UF):** `Feira de Santana – BA`.
- **Pergunta 3 (WhatsApp de Suporte):** `75992197406` (`https://wa.me/5575992197406`, `(75) 99219-7406`).
- **Pergunta 4 (Redes Sociais):** Instagram ativo `https://www.instagram.com/vitriminibr/` (TikTok e YouTube omitidos por enquanto para evitar links quebrados, com campos opcionais em `siteConfig.ts`).

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:**
  1. **OG Image + Cache-Busting:** Atualizar `frontend/public/og-cover.png` (`1200x630`, paleta `#E11D48` / `#0F172A`, sem amarelo, sem trimestral) + `?v=20261126` em `index.html`, `prerender.mjs`, `seo.ts` e `LandingPage.tsx`.
  2. **Credibilidade (`siteConfig.ts`):** Centralizar `SITE_CONFIG` (`brandName`, `legalName`, `documentLabel`, `documentNumber`, `cityState`, `supportEmail`, `supportWhatsapp`, `socialLinks`) consumido por `Footer.tsx`, `LandingPage.tsx`, `legalDocs.ts` e espelhado no `prerender.mjs`.
  3. **Hero CTA Duplo + "Veja na prática":** Reutilizar `DemoStoreModal.tsx` no 2º CTA do Hero e adicionar abas inline `Visão do Cliente` / `Painel do Lojista` em `LandingPage.tsx` (sem novo componente, sem amarelo, `cursor-pointer`).
  4. **4 Pilares:** Encomendas, Turnos, Sinal Pix automático e VitriLink + Mercado Pago 0% comissão.
  5. **SEO Nichos + Prerender + Sitemap:** Conteúdo 100% exclusivo por nicho em `nichePages.ts`, `prerender.mjs` gerando todas as rotas e `sitemap.xml` em `frontend/public/sitemap.xml` + `frontend/dist/sitemap.xml`.
- **Lições aplicáveis:** `[Interatividade]`, `[Tema Dinâmico]`, `[UX Writing / Zero Jargão]`.
- **Fora de escopo:** Zero backend/Prisma, zero novos pacotes pagos, zero scripts de rastreamento.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `N/A` *(Aprovado — escopo 100% frontend/estático)*
- **Schema & Índices (`@@index`):** Zero alterações em `schema.prisma` ou migrations.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** `N/A`.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:** Zero impacto em Brevo/Render/Supabase; zero novos pacotes/scripts externos; `og-cover.png` (`1200x630`) comprimida (`< 300 KB`) e `sitemap.xml` gerado em build-time via `prerender.mjs`.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-assets-seo` | `frontend/public/og-cover.png`, `frontend/public/sitemap.xml`, `frontend/index.html`, `frontend/src/utils/seo.ts`, `frontend/scripts/prerender.mjs`, `frontend/src/data/nichePages.ts` | Nova `og-cover.png` (`1200x630`, `70.0KB`, `#E11D48`/`#0F172A`, sem amarelo/trimestral), cache-busting `?v=20261126` (`og:image`, `og:image:secure_url`, `og:image:width/height`, `twitter:image`), JSON-LD `Organization` completo no `prerender.mjs` e `index.html`, nichos 100% exclusivos em `nichePages.ts` + `prerender.mjs`, e geração de `public/sitemap.xml` + `dist/sitemap.xml`. | `Concluído` |
| `dev-brand-landing` | `frontend/src/data/siteConfig.ts`, `frontend/src/components/Footer.tsx`, `frontend/src/pages/LandingPage.tsx`, `frontend/src/data/legalDocs.ts` | `SITE_CONFIG`, `Footer.tsx` com WhatsApp/Instagram/SSL/CNPJ condicional, `LandingPage.tsx` com JSON-LD Organization, CTA duplo, faixa de confiança, 4 pilares e seção "Veja na prática", e `legalDocs.ts` alinhado | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/frontend` (`Aprovado` — `cd frontend; npm run build` com `tsc -b && vite build && node scripts/prerender.mjs` finalizado com exit code `0`, gerando `dist/index.html`, 4 rotas de nicho, `/termos`, `/privacidade`, `public/sitemap.xml` e `dist/sitemap.xml`).
- **Edge cases & Inspeções:**
  - **OG & Twitter Meta Tags:** `og:image`, `og:image:secure_url` e `twitter:image` apontando para `https://vitrimini.com.br/og-cover.png?v=20261126` com dimensões `1200x630` confirmados em `dist/index.html` e nas 4 rotas de nicho (`/cardapio-digital-whatsapp`, `/catalogo-online-roupas`, `/vitrine-digital-confeitaria`, `/link-pedidos-instagram`).
  - **JSON-LD Estruturado:** Presença confirmada de `Organization` (`sameAs`, `contactPoint`), `SoftwareApplication` (`AggregateOffer`) e `FAQPage` em `dist/index.html` e nas 4 rotas de nicho.
  - **Sitemap:** `frontend/dist/sitemap.xml` validado com as 7 URLs canônicas (`/`, 4 nichos, `/termos`, `/privacidade`) e `<lastmod>2026-11-26</lastmod>`.
  - **Preços Antigos / Trimestral:** Zero ocorrências de `24,90`/`24.90`, `39,90`, `99,90` ou `trimestral` nos HTMLs gerados em `dist/` e nos arquivos-fonte (`LandingPage.tsx`, `Footer.tsx`, `nichePages.ts`, `siteConfig.ts`).
  - **UI / Design System:** Zero classes `yellow-` ou `amber-` em `LandingPage.tsx` e `Footer.tsx`; `cursor-pointer` confirmado nos links, botões e abas dos novos blocos.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:**
  - **Seção 6 (`qa`):** Confirmado build `/frontend` (`exit code 0`), `og-cover.png?v=20261126` (`1200x630`), `sitemap.xml` com 7 URLs, JSON-LD `Organization` + `SoftwareApplication` + `FAQPage` e zero preços antigos (`24,90`/`39,90`/`99,90`) ou `trimestral`.
  - **Links externos (`target="_blank"`):** Apenas 2 ocorrências em `Footer.tsx` (WhatsApp e Instagram), ambas com `rel="noopener noreferrer"`.
  - **Segredos / Dados sensíveis / LGPD:** Zero segredos ou dados sensíveis expostos; `siteConfig.ts` centraliza apenas dados públicos e mantém `documentNumber: ''` sem inventar CNPJ.
  - **Design System & Interatividade:** Zero classes `yellow-`/`amber-`; `cursor-pointer` presente em botões, links e abas (`Visão do Cliente` / `Painel do Lojista`).
  - **Responsividade `360px+`:** Layouts mobile-first (`grid-cols-1`, `flex-col sm:flex-row`, `flex-wrap`, `min-w-0`, `truncate`) garantem leitura sem corte horizontal.
  - **UX Writing:** Linguagem direta para lojistas e compradores, sem jargão técnico na interface pública.
  - **Estrutura de arquivos:** Confirmado que nenhum novo arquivo de componente foi criado em `frontend/src/components/` (apenas `frontend/src/data/siteConfig.ts` e `frontend/public/sitemap.xml`).
- **Veredito:** `APROVADO`

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` / `reviewer` ao finalizar)*
1. Subir o frontend localmente: `cd frontend; npm run dev` (ou servir o build estático com `npm run preview` após `npm run build`).
2. **Home (`/`):** Testar o CTA duplo no Hero (`Criar minha vitrine grátis` e `Ver vitrine de demonstração` abrindo o `DemoStoreModal`), conferir a faixa de confiança, os 4 pilares e alternar as abas `Visão do Cliente` e `Painel do Lojista` em `"Veja na prática"` (inclusive em viewport `360px`).
3. **Rodapé & Dados Institucionais:** Conferir `Feira de Santana – BA`, badge SSL/Mercado Pago, link do WhatsApp `(75) 99219-7406`, Instagram `@vitriminibr`, e modais de Termos de Uso / Política de Privacidade.
4. **Páginas de Nicho & SEO Estático:** Visitar `/cardapio-digital-whatsapp`, `/catalogo-online-roupas`, `/vitrine-digital-confeitaria` e `/link-pedidos-instagram` conferindo conteúdo exclusivo e inspecionar `frontend/dist/index.html`, `frontend/dist/sitemap.xml` e `frontend/public/og-cover.png`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A` *(promovida para `.agent/memory/lessons-learned.md`? `N/A`)*
