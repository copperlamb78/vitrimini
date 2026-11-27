# Dossiê da Tarefa: Vídeos Otimizados na Seção "Veja na prática" da Landing Page

- **Data:** 2026-11-26
- **Tamanho:** `M`
- **Status Atual:** `Pronto para Teste Local`
- **Ciclo do Circuit Breaker:** `0/2`

> **Resumo Executivo (para humanos — Dono: `orchestrator`):**
> Otimizar os vídeos reais `01-visao-cliente-pedido-whatsapp.mp4` (cortado em `23.5s`) e `03-painel-lojista-pix-automatico.mp4` para `540px` H.264 (`crf 28`, `+faststart`, sem áudio, `<= 2.5 MB`) com posters leves (`< 60 KB`) em `frontend/public/videos/`, e integrá-los na seção **"Veja na prática"** de `frontend/src/pages/LandingPage.tsx` em um mockup de smartphone com abas (`Visão do Cliente` / `Painel do Lojista`), lazy load via `IntersectionObserver`, controle Play/Pause, respeito a `prefers-reduced-motion` e zero layout shift (`aspect-[430/932]`).

---

## 1. Decisões e Alinhamento com o Usuário *(Dono: `orchestrator`)*
- **Pergunta 1 (Inline em `LandingPage.tsx`):** Manter seção "Veja na prática" inline em `LandingPage.tsx` sem criar novo arquivo em `frontend/src/components/` → **Resposta:** `OK, confirmado.`
- **Pergunta 2 (Ordem no mobile `360px`):** Mockup com vídeo em cima (logo abaixo das abas) e bullets + CTAs abaixo → **Resposta:** `OK, confirmado.`

---

## 2. Arquitetura & Contrato *(Dono: `principal-engineer`)*
- **Abordagem KISS:** Manter a seção "Veja na prática" inline em `frontend/src/pages/LandingPage.tsx` (reutilizando `DemoStoreModal`, zero novos componentes em `frontend/src/components/`, zero novos pacotes npm), com grid 2 colunas desktop / empilhado mobile (`360px+`), mockup de smartphone (`max-w-[300px]`, `rounded-[2.25rem]`, `border-[8px] border-slate-900`, `aspect-[430/932]`), paleta estrita `#E11D48` / `#0F172A` (ZERO amarelo), `IntersectionObserver` (`preload="none"` + `src` lazy + pausa fora da viewport / `visibilityState === 'hidden'`), `prefers-reduced-motion` e botão Play/Pause acessível (`cursor-pointer`).
- **Contrato de Assets (`frontend/public/videos/`):** `/videos/cliente-demo.mp4` (`-t 23.5`), `/videos/cliente-poster.webp`, `/videos/painel-demo.mp4`, `/videos/painel-poster.webp` (`scale=540:-2`, `libx264`, `crf 28`, `-preset slow`, `yuv420p`, `-an`, `+faststart`, `<= 2.5 MB` cada; posters `< 60 KB`).
- **Lições aplicáveis:** `[Interatividade]` (`cursor-pointer`) e `[UX Writing / Zero Jargão]`.
- **Fora de escopo:** Backend/Prisma, novos componentes/libs de player, alterações internas em `DemoStoreModal.tsx` ou hospedagem paga externa.

---

## 3. Parecer de Banco de Dados *(Dono: `dba-frugal`)*
- **Status:** `N/A` *(Aprovado — escopo 100% frontend e assets estáticos)*
- **Schema & Índices (`@@index`):** Zero alterações em `schema.prisma` ou migrations.
- **Queries & Concorrência (`select`, N+1, `$transaction`, `P2002`):** `N/A`.

---

## 4. Parecer de Custos & Cotas *(Dono: `finops`)*
- **Status:** `Aprovado`
- **Brevo (300/dia) / Render / Supabase / Cloudflare / Polling:** Zero impacto em Brevo/Render/Supabase/R2 e zero novos pacotes no `frontend/package.json`. Assets (`< 5.2 MB` total) ficam muito abaixo do teto de `25 MB/arquivo` do Cloudflare Pages; `preload="none"` + `IntersectionObserver` + pausa em `visibilityState === 'hidden'` protegem LCP e banda no 4G.

---

## 5. Mapa de Arquivos & Execução *(Mapa: `orchestrator` | Linhas: cada `developer`)*

| Subagente | Arquivos Permitidos | Resumo do que foi feito | Status |
| :--- | :--- | :--- | :--- |
| `dev-video-assets` | `frontend/public/videos/cliente-demo.mp4`, `frontend/public/videos/cliente-poster.webp`, `frontend/public/videos/painel-demo.mp4`, `frontend/public/videos/painel-poster.webp` | Gerados via `ffmpeg-static` temporário (removido): `cliente-demo.mp4` (989,07 KB / 0,97 MB, 23.50s, 540x1170, H.264/yuv420p, sem áudio, `moov@32`), `cliente-poster.webp` (54,94 KB, WebP), `painel-demo.mp4` (915,34 KB / 0,89 MB, 22.33s, 540x1170, H.264/yuv420p, sem áudio, `moov@32`), `painel-poster.webp` (41,74 KB, WebP). Total: 1,95 MB. | `Concluído` |
| `dev-landing-ui` | `frontend/src/pages/LandingPage.tsx` | Seção "Veja na prática" atualizada inline em `LandingPage.tsx` com abas acessíveis (`Visão do Cliente` / `Painel do Lojista` em `rose-600`), layout responsivo 2 colunas desktop / vídeo em cima no mobile (`>= 360px`), mockup de smartphone (`max-w-[300px]`, `rounded-[2.25rem]`, `border-[8px] border-slate-900`, `aspect-[430/932]`, brilho ambiente rosa/azul escuro, zero amarelo), vídeos `/videos/cliente-demo.mp4` e `/videos/painel-demo.mp4` com posters WebP, lazy load e pausa via `IntersectionObserver` (`rootMargin: '150px 0px'`, `threshold: 0.25`), listener `visibilitychange`, respeito a `prefers-reduced-motion`, botão Play/Pause acessível (`cursor-pointer`), 3 bullets curtos por aba e CTAs (`/criar` e `DemoStoreModal`). Validado com `npx tsc --noEmit` (exit 0). | `Concluído` |

---

## 6. Validação & Testes *(Dono: `qa`)*
- **Builds:** `/frontend` (`Aprovado` — `tsc -b && vite build && node scripts/prerender.mjs` exit code `0`, 1691 módulos, 7 rotas prerenderizadas + `sitemap.xml` gerados).
- **Assets & `+faststart` (`public/videos/` === `dist/videos/` por SHA-256):**
  - `cliente-demo.mp4`: `989,07 KB` (`0,97 MB` <= `2,5 MB`), `moov@32` antes de `mdat@9258` (`+faststart` OK).
  - `cliente-poster.webp`: `54,94 KB` (< `60 KB`), header `RIFF/WEBP` válido.
  - `painel-demo.mp4`: `915,34 KB` (`0,89 MB` <= `2,5 MB`), `moov@32` antes de `mdat@8670` (`+faststart` OK).
  - `painel-poster.webp`: `41,74 KB` (< `60 KB`), header `RIFF/WEBP` válido.
- **Prerender & Inspeção de `LandingPage.tsx` / Escopo:**
  - `frontend/dist/index.html` intacto: `<title>`, `<meta name="description">`, `canonical`, Open Graph/Twitter e JSON-LD válido (`Organization`, `SoftwareApplication`, `FAQPage`).
  - Zero classes `yellow-` ou `amber-` em `LandingPage.tsx`.
  - Confirmados `preload="none"`, `poster`, `IntersectionObserver` (`rootMargin: '150px 0px'`, `threshold: 0.25`), `visibilitychange`, `prefers-reduced-motion` (com guarda SSR), `aspect-[430/932]`, `cursor-pointer` e `aria-label` dinâmico no botão Play/Pause.
  - Zero alterações em `frontend/package.json` e zero novos arquivos em `frontend/src/components/`.
- **Edge cases:** Troca de abas pausa o vídeo anterior, zera `currentTime` e chama `video.load()`; `visibilityState === 'hidden'` pausa reprodução e respeita `prefers-reduced-motion` no retorno; clique em Play antes da interseção ativa `shouldLoadVideo` corretamente; layout `w-full max-w-[300px]` evita overflow horizontal em `360px`.
- **Veredito QA:** `Aprovado`

---

## 7. Code Review, AppSec & LGPD *(Dono: `reviewer`)*
- **Checklist:**
  - **QA & Assets:** Seção 6 validada com build `/frontend` (`exit code 0`), 4 assets idênticos em `public/videos/` e `dist/videos/` (`cliente-demo.mp4` 989,07 KB, `cliente-poster.webp` 54,94 KB, `painel-demo.mp4` 915,34 KB, `painel-poster.webp` 41,74 KB), `+faststart` (`moov@32` antes de `mdat`) e pré-render SEO/JSON-LD intacto.
  - **Escopo, AppSec & LGPD:** `git status --short` restrito a `LandingPage.tsx`, `frontend/public/videos/`, `.gitignore` (`marketing-videos/`) e este dossiê. Zero segredos, zero dados pessoais expostos, zero alteração em backend, auth, `package.json` ou novos arquivos em `frontend/src/components/`.
  - **Design System & Responsividade:** Paleta estrita `#E11D48` (`rose-600`) / `#0F172A` (`slate-900`), ZERO classes amarelo/âmbar, `cursor-pointer` em todos os controles clicáveis (abas, Play/Pause e CTAs), `aspect-[430/932]` (CLS = 0) e layout `360px+` sem overflow (mockup acima no mobile, 2 colunas no desktop).
  - **Acessibilidade & Performance:** `role="tablist"` / `role="tab"` / `role="tabpanel"` com `aria-selected`, `aria-controls` e `aria-labelledby`; `<video>` com `aria-label`, `preload="none"`, `muted`, `loop`, `playsInline`; botão Play/Pause com `aria-label` dinâmico e `aria-pressed`; respeito a `prefers-reduced-motion` (com guarda SSR), `IntersectionObserver` e pausa em `visibilitychange`.
  - **UX Writing:** Textos 100% naturais e diretos, zero jargão técnico.
- **Veredito:** `APROVADO`

---

## 8. Guia Rápido de Teste Local *(Dono: `orchestrator` / `reviewer` ao finalizar)*
1. No terminal em `frontend/`, execute `npm run dev` e abra `http://localhost:5173/`.
2. Role até a seção **"Veja na prática"** e confirme no DevTools (aba *Network*) que os vídeos só começam a carregar ao se aproximar da seção (`preload="none"` + `IntersectionObserver`) e iniciam a reprodução rapidamente (`+faststart`).
3. Alterne entre as abas **"Visão do Cliente"** e **"Painel do Lojista"**, verificando a troca de vídeo/poster, copy, bullets e pausa do vídeo anterior; teste também o botão **Play/Pause** e a troca de aba do navegador (`visibilitychange`).
4. No DevTools (modo responsivo em `360px` e `1280px+`), valide ausência de scroll horizontal, posicionamento do mockup acima do texto no mobile e o funcionamento dos botões **"Criar minha vitrine grátis"** e **"Testar vitrine interativa"**.
5. Opcional: emule `prefers-reduced-motion: reduce` no DevTools (*Rendering*) e confirme que o vídeo permanece no poster sem autoplay até o clique manual em Play.

---

## 9. Lições Aprendidas *(Promoção para Memória — Donos: `reviewer` / `orchestrator`)*
- **Houve retrabalho (QA/Review), bug sutil ou correção do usuário?** `Não`
- **Lição candidata (se aplicável, máx. 1–2 linhas):** `N/A` *(promovida para `.agent/memory/lessons-learned.md`? `Não — nenhuma lição nova necessária`)*
