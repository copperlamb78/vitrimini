# Regras Globais — VitriMini Multi-Agent Flow

Estas regras se aplicam a todos os agentes, subagentes e execuções neste repositório.

## 1. Stack e Ambiente
- **Frontend (`/frontend`):** React 19 + Vite + TypeScript + Tailwind CSS v4 (hospedado no Cloudflare Pages).
- **Backend (`/backend`):** Node.js + Express + Prisma + PostgreSQL/Supabase (hospedado no Render).
- **Integrações & Cotas:** Brevo (300 e-mails/dia), Mercado Pago (Pix), WhatsApp (`wa.me`), Cloudflare R2 (`r2.service.ts`), Cookies `HttpOnly` + Refresh Token (`.vitrimini.com.br`).
- **Isolamento de Banco:** O ambiente local deve apontar **exclusivamente** para o banco de desenvolvimento (`vitrimini-dev`). Nunca conectar ou rodar comandos destrutivos contra produção.

## 2. Padrões Obrigatórios da VitriMini
- **Princípio KISS:** Resolva o problema real com a solução mais simples. Sem over-engineering nem dependências desnecessárias.
- **LGPD Estrita:** Nunca vazar dados pessoais (telefone, e-mail, endereço, CPF/CNPJ, tokens) em rotas públicas (ex.: `/pedido/:trackingCode`, vitrine pública).
- **Tema Dinâmico da Vitrine:** Nunca usar preto fixo (`#000`, `bg-black`, `text-black`) onde o componente deve seguir a cor/tema dinâmico da loja (`frontend/src/constants/themes.ts`).
- **UX & UI:** Todo elemento interativo (botões, links, cards clicáveis) deve ter `cursor-pointer`. Use Skeleton Loaders (`Skeletons.tsx`) sem piscar durante polling.
- **UX Writing (Zero Jargão Técnico):** Nunca usar jargão técnico ("dev-speak" como *logado/deslogado, login/logout, slug, URL, token, hash, payload, autenticação, sessão expirada, 401/500, timeout, network error, upload, MIME, tracking*) em textos visíveis para compradores e lojistas (labels, botões, placeholders, estados vazios, toasts e mensagens de erro da API). Use linguagem natural e humana (`na sua conta`, `entrar`/`sair`, `link da vitrine`, `código`, `envio da foto`, `sua conexão expirou, entre novamente`, `código do pedido`). *Exceção:* Painel Super Admin e logs internos do servidor.
- **Reuso Obrigatório de Design System:** Antes de criar qualquer card, controle de formulário, modal, seletor, botão ou elemento de interface, o agente **DEVE** consultar os componentes existentes em `frontend/src/components/` (como `SettingsSectionCard`, `AppearanceControls`, `ThemedButton`, `ThemedCard`, `CatalogLivePreview`, etc.) e os padrões de `ManagePage.tsx` e `storeTheme.ts`, reutilizando-os sempre que aplicável.
- **Destaque Obrigatório no Chat para Componentes Novos:** Sempre que for estritamente necessário criar um **novo arquivo de componente** (`frontend/src/components/...`), o agente é obrigado a incluir ao final da resposta no chat uma seção destacada intitulada **`### 🧩 Novos Componentes Criados`**, listando o caminho do arquivo, o motivo pelo qual os componentes existentes não atendiam e onde ele foi utilizado.

## 3. Portões de Aprovação (Interação com o Usuário)
1. **Antes de codar (Checkpoint Obrigatório em demandas `M` e `G`):**
   - O `orchestrator` (com `principal-engineer`, `dba-frugal` e `finops`) apresenta um plano curto em tópicos e faz **no máximo 3 a 5 perguntas simples, diretas e objetivas** (preferencialmente múltipla escolha, sem textão).
   - **Proibido** iniciar subagentes `developer` antes do `"OK"` explícito do usuário.
2. **Durante Coding → QA → Reviewer (Modo Autônomo):**
   - Execute implementação, QA e Review de forma autônoma, respeitando o **Circuit Breaker de no máximo 2 ciclos** de correção.
   - **Só interrompa o usuário** se surgir uma decisão crítica de negócio, UX ou arquitetura que não possa ser inferida com segurança — sempre com pergunta curta e objetiva.
3. **Proteção de Produção e Git:**
   - **Nunca** execute `git push` nem comandos destrutivos de banco (`prisma migrate reset`, `prisma db push --force-reset`, `DROP`, `TRUNCATE`) sem aprovação explícita do usuário.

## 4. Regras do Dossiê Incremental por Tarefa
1. **Criação:** Todo `/dev-flow` inicia com o `orchestrator` criando `.agent/dossiers/YYYY-MM-DD-<slug-da-tarefa>.md` a partir de `.agent/templates/dossier-template.md` (em tarefas `P`, preencher apenas Cabeçalho, Seção 5, Seção 6 e Seção 8, marcando as demais como `N/A`).
2. **Leitura obrigatória:** Todo subagente deve ler o dossiê atual **antes de agir** para herdar decisões e contratos sem repetir perguntas.
3. **Escrita incremental e isolada:** Cada agente edita **apenas a sua própria seção** (e o Status no cabeçalho, quando aplicável), sem apagar o histórico anterior. Retrabalhos registram subitens curtos (`Ciclo 1`, `Ciclo 2`).
4. **Anti-inchaço:** Seja telegráfico (bullets curtos, tabelas, caminhos de arquivo). **Nunca** cole blocos inteiros de código ou logs extensos de terminal no dossiê.
5. **Versionamento & Segurança (Git/GitHub):** Todo `.agent/` (incluindo `.agent/dossiers/` e `.agent/memory/lessons-learned.md`) **deve ser versionado no Git** como documentação viva junto com cada entrega. **Regra obrigatória:** como vai para o GitHub, **nunca** escreva em dossiês ou lições aprendidas: chaves de API, segredos de `.env`, `DATABASE_URL`, tokens reais ou dados pessoais reais de clientes (telefone, e-mail, endereço — LGPD); use sempre exemplos fictícios ou nomes de variáveis (ex.: `JWT_SECRET`, `DATABASE_URL`).

## 5. Memória de Longo Prazo (`.agent/memory/lessons-learned.md`)
1. **Leitura Preventiva:** Todos os agentes devem consultar a categoria relevante de `.agent/memory/lessons-learned.md` antes de propor arquitetura, codar, testar ou revisar, citando no dossiê (1 linha) quando uma lição evitar uma pegadinha.
2. **Captura Automática (Sem Ruído):** Ao encerrar a tarefa, se houve retrabalho reprovado por `qa`/`reviewer`, bug sutil ou correção explícita do usuário, `reviewer` ou `orchestrator` registra a lição na Seção 9 do dossiê e promove para `.agent/memory/lessons-learned.md`. **Nunca** registrar erros triviais (typo, import faltando).
3. **Anti-Inchaço:** Máximo de 1–2 linhas por lição. Teto de **50 lições**; ao atingir o limite, o `orchestrator` consolida/remove lições obsoletas antes de adicionar novas.

## 6. Economia de Tokens (Modo Direto vs. Fluxo Multiagente)
Antes de criar dossiê ou acionar subagentes, avalie a demanda em duas trilhas:
- **A) Modo Direto (`hydrogen`, sem dossiê, sem subagentes):** Para tarefas triviais e localizadas (CSS/cor/ícone/`cursor-pointer`, textos/labels/copy, typo/import/prop em 1–2 arquivos sem regra de negócio, docs/config).
  1. Avise em 1 linha: `[Modo Direto • Hydrogen — sem dossiê para economizar tokens]`.
  2. Respeite tema dinâmico, `cursor-pointer`, LGPD e `.agent/memory/lessons-learned.md`.
  3. Edite diretamente, rode `npm run build` apenas no pacote afetado (`/frontend` ou `/backend`) e entregue resumo de 2–3 linhas.
- **B) Fluxo Multiagente (`/dev-flow` com Dossiê e `P`/`M`/`G`):** Sempre que envolver nova feature, lógica de negócio, mudança estrutural/múltiplos arquivos, banco (`schema.prisma`/queries), Auth/AppSec/LGPD, integrações/cotas (Brevo, Mercado Pago, polling, R2) ou bug complexo.
- **Transição Inteligente:**
  - **Auto-downgrade:** Mesmo se `/dev-flow` for chamado para algo trivial, execute no **Modo Direto** avisando em 1 linha (salvo se o usuário pedir *"force o fluxo completo"*).
  - **Auto-escalonamento:** Se no **Modo Direto** surgir necessidade de mexer em banco, contrato de API, auth ou lógica estrutural, pare antes de editar e escale para o **Fluxo Multiagente**.
- **Regra de Modelo Único por Demanda (`hydrogen` vs `neon`):**
  - `hydrogen` é o padrão para tudo (`Modo Direto`, `P`, `M` e maioria das tarefas).
  - **Zero troca no meio do fluxo:** Após o `"OK"` no checkpoint inicial, todo o pipeline (`Developers` → `QA` → `Reviewer` → fechamento) roda continuamente no modelo ativo no chat.
  - Apenas se a demanda exigir raciocínio pesado (`G`, arquitetura crítica, AppSec/LGPD ou refatoração estrutural complexa) e o chat não estiver em `neon`, o `orchestrator` pode exibir **uma única recomendação** no checkpoint inicial (antes do `"OK"`): `[Sugestão de modelo: Neon — se quiser trocar, faça agora antes do OK; senão sigo inteiro no modelo atual]`.
