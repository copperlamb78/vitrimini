# Dossiê da Tarefa: Evolução Links da Bio (Banner, Nichos, Cartões e Fix Outline)

- **Data:** 2026-11-24
- **Tamanho:** `M`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Evoluir a página de Links da Bio (`/:slug/links`) e seu editor no painel mantendo a identidade visual da VitriMini: corrigir o estilo de botão `outline` (fundo transparente + borda 2px da cor da loja), unificar a renderização entre preview e página pública em `BioLinksRenderer.tsx`, adicionar banner de capa (gradiente ou imagem R2), presets de nicho em CSS/SVG leve e cartões destaque (`featured-card`) com miniatura opcional.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Especificação completa fornecida pelo usuário na solicitação (inclui contratos TS, regras de estilo `outline`, presets de nicho, banner de capa e blocos do editor).

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Extrair o núcleo visual para `frontend/src/components/BioLinksRenderer.tsx` (componente puro usado por `BioLinksView.tsx` e diretamente no preview de `BioLinksTab.tsx`), garantindo 100% de fidelidade visual entre editor e `/:slug/links`. Presets de nicho (`default`, `bakery`, `petshop`, `fashion`, `delivery`) e `bannerStyle` (`none`, `brand-gradient`, `image`) ficam em mapa estático CSS/SVG leve sem dependências externas.
- **Endpoints / Payloads Zod / Tipos TS:**
  - `BioLinkItem`: adicionar `layout?: 'compact' | 'featured-card'` (`default: 'compact'`) e `imageUrl?: string` (URL segura `https://`/`http://` ou relativa `/uploads/`).
  - `BioLinksConfig`: adicionar `nichePreset?: 'default' | 'bakery' | 'petshop' | 'fashion' | 'delivery'` (`default: 'default'`), `bannerUrl?: string` e `bannerStyle?: 'none' | 'brand-gradient' | 'image'` (`default: 'none'`).
  - Reusar `PUT /api/catalogs/:id` (`upload.any()`) com campos `bioBanner` e `bioLinkImage_<id>`.
- **Lições aplicáveis (`.agent/memory/lessons-learned.md`):** `[Tema Dinâmico]`, `[Interatividade]` (`cursor-pointer`), `[UX Writing / Zero Jargão]`.
- **Fora de escopo:** Novos endpoints dedicados, analytics de cliques, fontes externas ou editor de crop.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado`
- **Schema & Índices (`@@index`):** `Catalog.bioLinksConfig Json?` permanece inalterado, sem novas tabelas ou migrations.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** Manter `select` enxuto nas rotas públicas; retrocompatibilidade garantida com campos opcionais/defaults para configs antigas; allowlist de URLs existentes e exclusão de imagens antigas/removidas do R2 (`oldUrlsToDelete`) somente após commit da transação.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:** Custo zero garantido — presets de nicho apenas com CSS/SVG inline (`opacity: 0.04` a `0.08`), compressão no cliente (`compressImage`) antes do upload R2 e limpeza de órfãos via `deleteImagesFromR2`.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend` | `backend/src/utils/validation.ts`, `backend/src/routes/catalog.routes.ts` | Zod schemas retrocompatíveis (`nichePreset`, `bannerUrl`, `bannerStyle`, `layout`, `imageUrl`) + upload R2 (`bioBanner`, `bioLinkImage_<id>`) e limpeza em `oldUrlsToDelete` | `Concluído` |
| `dev-frontend` | `frontend/src/types/catalog.ts`, `frontend/src/utils/bioLinks.ts`, `frontend/src/components/BioLinksRenderer.tsx`, `frontend/src/components/BioLinksView.tsx`, `frontend/src/components/BioLinksTab.tsx` | `BioLinksRenderer` unificado, fix `outline`, banner de capa, presets CSS/SVG, cartões destaque e editor em 3 blocos | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Veredito:** `APROVADO`
- **Builds e Prisma:**
  - `npx prisma generate` (`backend`): `exit code 0` (Prisma Client v6.19.3 gerado).
  - `npm run build` (`backend` — `prisma generate && tsc`): `exit code 0`.
  - `npm run build` (`frontend` — `tsc -b && vite build && node scripts/prerender.mjs`): `exit code 0` (bundle gerado em `dist/` com prerender de todas as rotas).
- **Inspeção de Código & Critérios de Aceite:**
  - **Contraste em 3 temas × 3 `buttonStyle` × `highlighted: true`:** Validado em `BioLinksRenderer.tsx` e `bioLinks.ts`. `minimal` e `brand-soft` usam `text-zinc-900` / `bg-white`; `dark-glass` (`#09090B`) usa `text-zinc-50` / `bg-white/10 text-zinc-100` e `getEffectiveOutlineColor` (fallback para `#E4E4E7` quando luminância `< 0.2`, protegendo cor `zinc`). Botões com `highlighted: true` aplicam `backgroundColor: palette.hex` e `color: getContrastTextColor(palette.hex)` (`#18181B` ou `#FFFFFF`), sobrepondo `isOutline`.
  - **Estilo `outline`:** Confirmado `backgroundColor: 'transparent'`, `borderWidth: '2px'`, `borderStyle: 'solid'`, `borderColor: outlineColor` e `color: outlineColor` em `BioLinksRenderer.tsx`, com hover via `hexToRgba(outlineColor, 0.1)` e restauração para `'transparent'`.
  - **Fallback de `bannerUrl`:** `BioLinksRenderer.tsx` reseta `bannerImageError` via `useEffect` quando `resolvedBannerUrl` ou `bannerStyle` mudam e utiliza `onError={() => setBannerImageError(true)}` no `<img>`, alternando automaticamente para `showGradientBanner` (`brand-gradient`) caso `bannerUrl` esteja ausente ou falhe ao carregar.
  - **Responsividade `360px`:** Container raiz com `w-full overflow-x-hidden`, camada de textura com `pointer-events-none absolute inset-0`, wrapper `max-w-md`, banner `w-full overflow-hidden` e textos com `min-w-0` / `truncate`, sem risco de overflow horizontal em `360px`.
  - **Sanitização de URLs & Retrocompatibilidade:** `isSafeHttpUrl` (apenas `http:`/`https:`) aplicado no Zod (`backend/src/utils/validation.ts`), no editor (`BioLinksTab.tsx`) e na renderização (`BioLinksRenderer.tsx`); imagens validadas por `isSafeBioImageUrl` e allowlist `allowedExistingBioImageUrls` em `catalog.routes.ts`. `normalizeBioLinksConfig` e `bioLinksConfigSchema` tratam campos novos (`nichePreset`, `bannerStyle`, `bannerUrl`, `layout`, `imageUrl`) com defaults opcionais retrocompatíveis.

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **Checklist de Auditoria:**
  - [x] **Auth & Trava de Plano Pro:** `handleAuthenticatedCatalogUpdate` (`backend/src/routes/catalog.routes.ts`) valida ownership (`existing.userId !== req.user!.id` → `403`) e bloqueia `parsedBioLinks.enabled && !hasProFeatures(existing)` com `403`. No frontend (`BioLinksTab.tsx`), `handleToggleEnabled` e `handleSave` bloqueiam ativação sem `hasProAccess` abrindo o modal de upgrade (`upgradeModalOpen`) e forçam `enabled: false` no payload.
  - [x] **LGPD em Rotas Públicas:** `GET /api/catalogs/:slug` utiliza `select` restrito e não expõe `userId`, `mpAccessToken` ou dados privados na resposta; `bioLinksConfig` só é retornado quando `hasProFeatures(catalog)` e `enabled === true` (caso contrário `null`).
  - [x] **AppSec (Sanitização, URLs, R2 Allowlist & Órfãos):** `validation.ts` aplica `sanitizePlainText` em `title`, `subtitle` e `socials`, valida URLs de links com `isSafeHttpUrl` (`http://`/`https://`) e bloqueia `data:`/base64 em `bannerUrl`/`imageUrl` via `isSafeBioImageUrl`. `catalog.routes.ts` valida imagens existentes contra `allowedExistingBioImageUrls`, processa uploads R2 (`bioBanner`, `bioLinkImage_<id>`) com `assertValidImageMagicBytes`, e agenda exclusão de órfãos via `oldUrlsToDelete` filtrado por `retainedUrls` (`deleteImagesFromR2`) somente após o `$transaction`.
  - [x] **Design System & `lessons-learned.md`:** `[Tema Dinâmico]` respeitado em `BioLinksTab.tsx` (`palette.hex` via `getActiveCardStyle`, toggle, ícones, checkboxes e botão Salvar, sem preto fixo em seletores ativos) e `BioLinksRenderer.tsx` (`outline` transparente com borda `2px` dinâmica e `getEffectiveOutlineColor` para `dark-glass`); `[Interatividade]` com `cursor-pointer` em todos os elementos clicáveis; `[UX Writing / Zero Jargão]` sem termos técnicos voltados ao lojista/comprador.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Acesse o painel (`/gerenciar`, aba **Links da Bio**) com a conta Pro (`antonio@vitrimini.com.br` / `antonio-pro`).
2. Teste **Aparência & Capa** (presets de nicho, 3 temas, botão `Contorno` com fundo transparente + borda `2px`, banner degradê/imagem).
3. Teste **Meus Links** com um link em **Formato Cartão Destaque** + miniatura e outro com **Destaque** ativo no modo `Contorno`.
4. Salve e compare o preview do editor com a página pública `/:slug/links` em `360px` (mobile).

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
