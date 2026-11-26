# Dossiê da Tarefa: Refatoração UI/UX da CreatorPage com Design System do ManagePage

- **Data:** 2026-11-25
- **Tamanho:** `M` (Frontend UI/UX Refactor — reuso de `SettingsSectionCard`, `AppearanceControls`, `storeTheme.ts` e `CatalogLivePreview`)
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Refatorar `frontend/src/pages/CreatorPage.tsx` para adotar integralmente a componentização, hierarquia visual e Design System consolidados em `ManagePage.tsx` (`SettingsSectionCard`, `AppearanceControls` com `allowRelaxedShape={false}`, motor `storeTheme.ts`, `CatalogLivePreview` e preview mobile `< md` ao vivo), preservando rascunho `vitrimini_draft_v1`, validação, autenticação e payload de criação intactos.

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- Especificação completa fornecida pelo usuário na solicitação.

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Reuso direto (KISS):** `SettingsSectionCard`, `AppearanceControls` (`allowRelaxedShape={false}`), `storeTheme.ts` (`resolveStoreTheme`), `CatalogLivePreview` (coluna lateral + preview mobile `< md` em *Aparência & Estilo* com `useDeferredValue`), `DeliveryScheduleEditor` e `LogoUploader`.
- **Preservação de contrato:** Payload `FormData` para `createCatalog` intacto (`storeName`, `themeColor`, `whatsapp`, `pixKey`, `depositPct`, `paymentNotice`, `deliveryDates`, `notes`, `products`, `logo`, `image_${i}`), rascunho `vitrimini_draft_v1` retrocompatível (`storeAppearance?` opcional), e fluxos de auth/trial/`AuthModal`/`ConnectMercadoPagoModal`/`PixPaymentModal` preservados.
- **5 Seções `SettingsSectionCard`:** 1. Identidade da Vitrine, 2. Aparência & Estilo, 3. Atendimento e Cobrança no Pedido, 4. Produtos para Encomenda, 5. Datas & Turnos de Entrega / Retirada.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `Aprovado` (`N/A` — zero alterações em `backend/`, `schema.prisma`, migrations ou queries).

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado` — zero novos pacotes, zero custos extras.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-creator-ux` | `frontend/src/pages/CreatorPage.tsx` | Refatorada com `SettingsSectionCard` (5 blocos), `AppearanceControls` (`allowRelaxedShape={false}`), `resolveStoreTheme`, `CatalogLivePreview` + preview mobile `< md`, validação por seção e `vitrimini_draft_v1` retrocompatível | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Veredito:** `APROVADO`
- **Build Frontend (`frontend/`):** `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`) executado após a refatoração com **exit code `0`** (`CreatorPage-DqWkYSc-.js` 25.45 kB / gzip 7.31 kB + prerender de 7 rotas).
- **Inspeção de `frontend/src/pages/CreatorPage.tsx`:**
  - **Reuso direto:** Confirmado o uso de `SettingsSectionCard` (5 seções), `AppearanceControls` (`allowRelaxedShape={false}`), `resolveStoreTheme`, `CatalogLivePreview` (preview mobile `< md` em *Aparência & Estilo*, coluna lateral `lg:sticky` e modal mobile), `DeliveryScheduleEditor` e `LogoUploader`, sem componentes duplicados.
  - **Rascunho & Contrato:** `DRAFT_STORAGE_KEY` (`vitrimini_draft_v1`) preservado com hidratação retrocompatível e salvamento automático; limpeza confirmada em `handleDiscardDraft`, no fluxo `response.activatedByTrial` e em `handlePaymentConfirmed`; `FormData` enviado a `createCatalog` preservado integralmente.
  - **Terminologia:** Zero ocorrências de `"sinal"` (case-insensitive) em `CreatorPage.tsx`.
  - **Responsividade `360px`+:** `overflow-x-hidden` no container raiz, `min-h-[44px]` (e `min-h-[48px]` no CTA principal) e `cursor-pointer` aplicados nos controles interativos, com grids responsivos (`grid-cols-1`, `sm:grid-cols-2`, `sm:grid-cols-3`, `lg:grid-cols-12`) e `w-full` nos campos. *(Obs.: `min-w-0` não aparece explicitamente em `CreatorPage.tsx`, sem impacto observado com `overflow-x-hidden` e `w-full` nos grids.)*

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Veredito:** `APROVADO`
- **Design System & `lessons-learned.md`:**
  - **Tema dinâmico:** `resolvedStoreTheme.primaryColor` e `resolvedStoreTheme.textOnPrimary` aplicados no seletor ativo de cobrança (`depositPct`), botão *Novo Produto*, CTA principal de publicação, CTA pós-trial e ícones de destaque; zero preto fixo (`bg-zinc-900`/`#18181B`) em seletores ativos.
  - **Interatividade:** `cursor-pointer` aplicado em todos os elementos clicáveis (`Link`, `button`, `label` de foto e `switch` de disponibilidade) e `cursor-not-allowed` no submit desabilitado.
  - **UX Writing (Zero Jargão):** Textos voltados ao lojista 100% em linguagem natural, sem ocorrências de `"sinal"`, `"slug"`, `"token"`, `"upload"`, `"login"`, `"URL"` ou termos técnicos.
- **Contratos, Fluxos & AppSec:**
  - **`createCatalog` (`FormData`):** Payload preservado integralmente (`storeName`, `themeColor`, `whatsapp`, `pixKey`, `depositPct`, `paymentNotice`, `deliveryDates`, `notes`, `logo`, `image_${i}`, `products`).
  - **Rascunho `vitrimini_draft_v1`:** Hidratação retrocompatível via `resolveStoreTheme(parsed.themeColor, parsed.storeAppearance)`, fallback de cota no `localStorage` e limpeza garantida em `handleDiscardDraft`, `activatedByTrial` e `handlePaymentConfirmed`.
  - **Auth / Trial / Pagamento:** `AuthModal`, `ConnectMercadoPagoModal` e `PixPaymentModal` preservados, com `getSafeErrorMessage` nos blocos de erro e atributos de acessibilidade (`role="dialog"`, `aria-modal`, `role="switch"`).

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` ao finalizar)*
1. Suba o frontend (`cd frontend && npm run dev`) e acesse `/criar` em `360px` e desktop.
2. Navegue pelas 5 seções (`SettingsSectionCard`): *Identidade da Vitrine*, *Aparência & Estilo* (confira preview mobile `< md` ao vivo no topo e `AppearanceControls` sem `Descontraído`), *Atendimento e Cobrança no Pedido* (`0%` / `50%` / `100%`), *Produtos para Encomenda* e *Datas & Turnos de Entrega / Retirada*.
3. Recarregue a página para confirmar persistência do rascunho `vitrimini_draft_v1`, teste `Descartar rascunho` e publique uma vitrine validando trial/pagamento.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A`
