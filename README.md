<p align="center">
  <img src="./frontend/src/assets/logo-vitrimini.png" alt="VitriMini" height="64" />
</p>

<h1 align="center">VitriMini</h1>

<p align="center">
  <strong>Micro-SaaS minimalista para vendedores de encomendas criarem vitrines de pedidos em 2 minutos — sem login, com produtos ilimitados e pagamento único via Pix.</strong>
</p>

---

## Sobre o Projeto

O **VitriMini** foi projetado para confeitarias, ceias sazonais, salgados, cestas artesanais e papelarias personalizadas que precisam organizar pedidos no WhatsApp sem depender de plataformas complexas ou mensalidades.

- **Zero cadastro ou senha:** o lojista monta a vitrine, paga a taxa única via Pix (**R$ 24,90** por 90 dias) e recebe dois links na hora:
  - **Link Público da Vitrine (`/c/:slug`):** para divulgar na bio do Instagram e enviar aos clientes.
  - **Link Secreto de Edição (`/editar/:editToken`):** URL exclusiva com UUID para pausar itens esgotados, alterar preços, datas e adicionar produtos a qualquer momento.
- **Produtos ilimitados** com fotos otimizadas automaticamente no navegador (`WebP` via HTML5 `<canvas>`).
- **Pedidos prontos no WhatsApp:** cálculo automático do valor total e do sinal (`0%`, `50%` ou `100%`), cópia da chave Pix da loja e resumo formatado.

---

## Principais Funcionalidades

- **Criador com Prévia ao Vivo (`/`):**
  - Layout em duas colunas no desktop (formulário + mockup interativo de celular) e abas alternáveis no mobile.
  - Rascunho salvo automaticamente no `localStorage`.
- **Identidade Visual Personalizável:**
  - Upload circular de logo/foto da loja (ou avatar automático com iniciais).
  - **6 paletas de cores curadas:** *Rosa Confeitaria*, *Vermelho Festivo*, *Dourado Artesanal*, *Verde Esmeralda*, *Roxo Açaí & Doces* e *Preto Minimalista*.
- **Construtor Rápido de Datas e Turnos:**
  - Calendário nativo + chips de turno (`Manhã`, `Tarde`, `Noite`, `Horário Comercial` ou sem turno) ordenados cronologicamente, além de atalhos para encomendas contínuas.
- **Fluxo Pix Blindado & Recuperação de Links:**
  - Bloqueio contra fechamento acidental do modal, polling automático a cada 3 segundos, checagem ao retornar do app do banco e retomada automática após reload.
  - Histórico local em **"Minhas Vitrines"** e recuperação segura via WhatsApp + Chave Pix (ou nome exato da loja).
- **Armazenamento 100% Local e Enxuto:**
  - Imagens comprimidas no front-end (`<= 800px` produtos / `<= 400px` logo em `image/webp`) e salvas localmente em `/backend/uploads` via `multer`.

---

## Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Front-end** | React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Lucide Icons |
| **Back-end** | Node.js, Express, TypeScript, Multer, QRCode |
| **Banco de Dados** | PostgreSQL + Prisma ORM |
| **Pagamentos** | Mercado Pago REST API (Pix) + Modo local `MOCK_PIX=true` |

---

## Estrutura do Monorepo

```text
VitriMini/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Modelos Catalog e Product
│   ├── src/
│   │   ├── config/upload.ts      # Configuração Multer (500KB máx, UUID .webp)
│   │   ├── lib/prisma.ts         # Instância do Prisma Client
│   │   ├── middlewares/          # Sanitização global de erros (errorHandler.ts)
│   │   ├── routes/               # Rotas públicas, gestão e webhook Pix
│   │   ├── services/             # Integração Mercado Pago Pix + Mock Pix
│   │   ├── utils/slug.ts         # Geração de slugs únicos
│   │   └── server.ts             # Servidor Express + arquivos estáticos /uploads
│   ├── uploads/                  # Armazenamento local das imagens
│   └── .env.example
└── frontend/
    ├── public/                   # Favicon oficial
    ├── src/
    │   ├── assets/               # Logos oficiais em PNG transparente
    │   ├── components/           # Mockup, Modal Pix, Construtor de Datas, Temas
    │   ├── constants/themes.ts   # 6 paletas de cores e iniciais
    │   ├── pages/                # CreatorPage, StorePage e ManagePage
    │   ├── services/api.ts       # Cliente HTTP com tratamento seguro de erros
    │   └── utils/                # Compressão WebP <canvas>, moeda e localStorage
    └── .env.example
```

---

## Como Rodar Localmente

### Pré-requisitos
- **Node.js** 20+
- **PostgreSQL** rodando localmente

### 1. Configurar o Back-end

```bash
cd backend
cp .env.example .env
```

Edite o arquivo `backend/.env` com a URL do seu banco PostgreSQL:

```env
PORT=3333
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vitrimini?schema=public"
MOCK_PIX=true
MP_ACCESS_TOKEN=
MP_WEBHOOK_URL=
```

Instale as dependências, sincronize o schema do Prisma e inicie o servidor:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

O back-end estará rodando em `http://localhost:3333`.

### 2. Configurar o Front-end

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Acesse `http://localhost:5173` no navegador.

> **Dica de Teste Local:** Com `MOCK_PIX=true` no `backend/.env`, o modal de pagamento exibe um botão **"Simular Pagamento Aprovado"** para testar todo o fluxo de ativação instantaneamente sem precisar de credenciais de produção.

---

## Produção (Mercado Pago Pix)

Para ativar cobranças reais em produção:
1. Defina `MOCK_PIX=false` no `backend/.env`.
2. Preencha `MP_ACCESS_TOKEN` com seu Access Token de produção do Mercado Pago.
3. Configure `MP_WEBHOOK_URL=https://seudominio.com/api/webhooks/pix` para aprovação automática via webhook.

---

## Principais Rotas da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/catalogs` | Cria vitrine `DRAFT` com upload de logo/fotos e gera cobrança Pix |
| `GET` | `/api/catalogs/:id/status` | Consulta status da vitrine (`DRAFT`, `ACTIVE`, `EXPIRED`) |
| `POST` | `/api/catalogs/recover` | Recupera links de vitrines ativas via WhatsApp + Chave Pix / Nome da loja |
| `POST` | `/api/webhooks/pix` | Recebe notificação de pagamento e ativa vitrine por 90 dias |
| `GET` | `/api/store/:slug` | Retorna vitrine pública ativa (ou prévia com `?preview=true`) |
| `GET` | `/api/manage/:editToken` | Carrega dados completos para o painel secreto do lojista |
| `PUT` | `/api/manage/:editToken` | Atualiza loja, tema, logo, datas e produtos |
