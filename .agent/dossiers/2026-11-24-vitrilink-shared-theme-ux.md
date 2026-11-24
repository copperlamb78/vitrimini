# Dossiê da Tarefa: Evolução Visual Compartilhada — Vitrine + VitriLink & UX do Painel

- **Data:** 2026-11-24
- **Tamanho:** `G`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Unificar a identidade visual entre Vitrine (`/:slug`) e VitriLink (`/:slug/links`) com um motor de tema compartilhado (`storeTheme.ts`), componentes UI reutilizáveis (`SettingsSectionCard`, `AppearanceControls`, `ThemedButton`, `ThemedCard`, `VitriLinkRenderer`), herança automática de tema no VitriLink, correção definitiva do estilo `outline` e reorganização UX/UI da aba da Vitrine em `ManagePage.tsx` com seções recolhíveis e progressive disclosure.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Especificação completa fornecida pelo usuário na solicitação (contratos TS, nomes de componentes, herança `inheritStoreTheme`, identidade **VitriLink** e seções de `ManagePage.tsx`).

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Motor de Tema (`frontend/src/utils/storeTheme.ts`):** Mapeia `themeColor` legado + `StoreAppearanceConfig` (`bgColor`, `primaryColor`, `buttonShape`, `buttonFill`, `nichePreset`) para CSS Variables (`--vm-bg`, `--vm-surface`, `--vm-primary`, `--vm-text`, `--vm-text-on-primary`, `--vm-radius`) com cálculo automático de contraste e fallback seguro.
- **Componentização DRY:** `SettingsSectionCard.tsx` (Vitrine + VitriLink), `AppearanceControls.tsx` (2 abas: Fundo | Botões + nicho 1-clique), `ThemedButton.tsx` (corrige `outline` com `backgroundColor: 'transparent'` + `border-2`), `ThemedCard.tsx` e `VitriLinkRenderer.tsx` (fidelidade 1:1 entre preview e `/:slug/links`).
- **Herança & Identidade:** `inheritStoreTheme: true` padrão no VitriLink; marca oficial **VitriLink** no painel mantendo rota `/:slug/links`.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado` (zero alterações em `schema.prisma`, zero migrations).
- **Persistência:** `Catalog.themeColor` passa a aceitar preset legado ou hex `#RRGGBB`; `storeAppearance` é persistido dentro do JSON `Catalog.bioLinksConfig` sem bloquear plano Essential (`enabled: false`), e retornado separadamente no payload da vitrine pública (`GET /store/:slug`) e de gestão sem vazar links do VitriLink. Retrocompatibilidade total via campos opcionais/defaults no Zod.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado` — texturas de nicho exclusivamente em CSS/SVG inline (`opacity: 0.04`–`0.08`), zero dependências novas e reuso do fluxo R2 + `compressImage`.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-backend` | `backend/src/utils/validation.ts`, `backend/src/services/catalog.service.ts`, `backend/src/repositories/catalog.repository.ts`, `backend/src/controllers/catalog.controller.ts` | Schemas `storeAppearanceSchema` / `inheritStoreTheme`, aceitação hex `#RRGGBB` em `themeColor`, merge não destrutivo e exposição de `storeAppearance` sem exigir Pro | `Concluído` |
| `dev-theme-ui` | `frontend/src/types/catalog.ts`, `frontend/src/constants/themes.ts`, `frontend/src/utils/storeTheme.ts`, `frontend/src/utils/bioLinks.ts`, `frontend/src/components/SettingsSectionCard.tsx`, `frontend/src/components/ThemedButton.tsx`, `frontend/src/components/ThemedCard.tsx`, `frontend/src/components/AppearanceControls.tsx` | Motor de tema `--vm-*`, `SettingsSectionCard`, `ThemedButton` (fix `outline`), `ThemedCard` e `AppearanceControls` | `Concluído` |
| `dev-vitrilink-store` | `frontend/src/components/VitriLinkRenderer.tsx`, `frontend/src/components/BioLinksRenderer.tsx`, `frontend/src/components/BioLinksView.tsx`, `frontend/src/pages/BioLinksPage.tsx`, `frontend/src/pages/StorePage.tsx`, `frontend/src/components/CatalogLivePreview.tsx`, `frontend/src/components/PhoneMockupPreview.tsx` | `VitriLinkRenderer` com `--vm-*` e fix `outline`, herança em `BioLinksPage`/`BioLinksView`, `StorePage` e previews temáticos | `Concluído` |
| `dev-manage-ux` | `frontend/src/components/BioLinksTab.tsx`, `frontend/src/pages/ManagePage.tsx` | Identidade **VitriLink**, toggle `inheritStoreTheme`, `SettingsSectionCard` nos 4 blocos da Vitrine + preview mobile `< md` | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Veredito:** `APROVADO`
- **Backend (`backend/`):**
  - `npx prisma validate`: exit code `0` (schema válido).
  - `npx prisma generate`: exit code `0` (Prisma Client v6.19.3 gerado).
  - `npm run build` (`prisma generate && tsc`): exit code `0`.
- **Frontend (`frontend/`):**
  - `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`): exit code `0` (1692 módulos, 7 rotas pré-renderizadas).
- **Critérios de Código Validados:**
  1. **Consistência de `SettingsSectionCard` e preview mobile `< md`:** `SettingsSectionCard.tsx` padronizado nos 4 blocos de `ManagePage.tsx` e nos 3 blocos de `BioLinksTab.tsx`. `ManagePage.tsx` exibe prévia mobile ao vivo (`<div className="md:hidden">`) com `CatalogLivePreview` dentro de `Aparência & Estilo`, e `BioLinksTab.tsx` mantém botão/modal de prévia mobile (`lg:hidden`).
  2. **Contraste em `Fundo` × `Botões`:** `resolveStoreTheme` (`storeTheme.ts`) calcula luminância WCAG para `isDark`, `textColor`, `textMutedColor`, `textOnPrimary` e garante contraste mínimo `>= 3.0` para `outlineColor`. `ThemedButton.tsx` aplica `backgroundColor: 'transparent'` + `borderWidth: '2px'` no modo `outline` (exceto `highlighted: true`, que usa `primaryColor` + `textOnPrimary`).
  3. **Retrocompatibilidade:** `resolveStoreTheme` e `resolveVitriLinkAppearance` aceitam `storeAppearance: null`, `bioLinksConfig: null`, `themeColor: 'rose'` e `buttonStyle: 'outline'` com fallbacks seguros (`#FAFAFA`, `getTheme(themeColor).hex`, `inheritStoreTheme: true` padrão e mapeamento legado quando `inheritStoreTheme: false`).
  4. **Sanitização de URLs e responsividade `360px`:** `isSafeHttpUrl` (`backend/src/utils/validation.ts` e `frontend/src/utils/bioLinks.ts`) restringe links a `http://` e `https://` (`VitriLinkRenderer.tsx` ignora URLs inválidas fora do preview). `VitriLinkRenderer.tsx` usa `overflow-x-hidden` e `min-w-0`/`truncate` para evitar overflow horizontal em `360px` (`StorePage.tsx` usa containers responsivos `max-w-xl`/`px-4` sem `overflow-x-hidden` explícito na raiz).

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **Plano Pro & LGPD:**
  - `GET /api/store/:slug` (`getPublicStoreBySlug` em `backend/src/services/catalog.service.ts`) expõe `storeAppearance` em qualquer plano sem vazar `bioLinksConfig.links` ou `socials` quando `!hasProFeatures(catalog) || enabled !== true` (retorna `bioLinksConfig: null`).
  - Ativar `enabled: true` no VitriLink exige Plano Pro (`403` em `updateOwnedCatalog` + modal de upgrade em `BioLinksTab.tsx`), enquanto salvar `storeAppearance` pela Vitrine (`ManagePage.tsx`) funciona em qualquer plano com merge não destrutivo.
- **AppSec:**
  - `isSafeHttpUrl` (`backend/src/utils/validation.ts` e `frontend/src/utils/bioLinks.ts`) restringe links a `http://` e `https://` (bloqueando `data:`, `javascript:` e base64).
  - `hexColorSchema` valida `#RRGGBB` estrito e enums fechados no Zod (`buttonShapeSchema`, `buttonFillSchema`, `nichePresetSchema`, `bioLinksConfigSchema`).
  - Allowlist R2 (`allowedExistingBioImageUrls` em `catalog.service.ts`) protege `bannerUrl` e `links[].imageUrl`.
- **Design System & `lessons-learned.md`:**
  - Tema dinâmico aplicado nos seletores ativos de `AppearanceControls.tsx` e `BioLinksTab.tsx` (sem preto fixo), `cursor-pointer` (e `cursor-not-allowed` quando desabilitado) nos clicáveis, marca oficial **VitriLink** no painel e zero jargão técnico nos textos para lojistas/compradores.

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba backend (`cd backend && npm run dev`) e frontend (`cd frontend && npm run dev`).
2. Em `/gerenciar`, confira a aba **Vitrine** organizada em 4 `SettingsSectionCard` (apenas *Identidade da Loja* aberta inicialmente). Abra **Aparência & Estilo**, teste a troca de **Fundo**, **Botões** (`Profissional` / `Moderno` / `Descontraído`, `Sólido` / `Contorno`) e **Estilo do seu Negócio**, observando o preview mobile `< md` ao vivo no topo.
3. Salve e acesse a vitrine pública `/:slug` confirmando as cores, cantos, textura de nicho e contraste.
4. Na aba **VitriLink**, confirme o toggle **"Usar visual da Vitrine"** ativo por padrão, teste desmarcá-lo para customizar separado, teste **Banner de Capa** e **"Cartão com foto"** (`featured-card`), e compare o preview com `/:slug/links`.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
