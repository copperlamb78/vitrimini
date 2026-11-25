import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const baseIndexPath = path.join(distDir, 'index.html');

const SITE_URL = 'https://vitrimini.com.br';
const OG_IMAGE = `${SITE_URL}/og-cover.png`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const COMMON_PLANS = [
  {
    name: 'Teste Grátis (1ª Vitrine)',
    price: 'R$ 0,00 por 15 dias',
    desc: 'Sua primeira vitrine entra no ar na hora por 15 dias grátis, com 0% de comissão e cancelamento simples pelo painel.',
  },
  {
    name: 'Plano Essencial • 90 dias',
    price: 'R$ 24,90 / 90 dias',
    desc: 'Produtos ilimitados, pedidos organizados no WhatsApp, cálculo de sinal via Pix, link de acompanhamento em tempo real e 0% de comissão.',
  },
  {
    name: 'Plano Pro • Pagamento Automático',
    price: 'R$ 39,90 / 90 dias ou R$ 99,90 / ano (365 dias)',
    desc: 'Tudo do Essencial + integração direta com sua conta Mercado Pago para receber Pix e Cartão automaticamente com baixa automática no painel.',
  },
];

const INTERNAL_LINKS = [
  { href: '/', label: 'VitriMini — Catálogo Online e Pedidos pelo WhatsApp' },
  {
    href: '/cardapio-digital-whatsapp',
    label: 'Cardápio Digital para WhatsApp sem Taxas por Pedido',
  },
  {
    href: '/catalogo-online-roupas',
    label: 'Catálogo Online para Loja de Roupas e Moda',
  },
  {
    href: '/vitrine-digital-confeitaria',
    label: 'Vitrine Digital e Link de Pedidos para Confeitaria',
  },
  {
    href: '/link-pedidos-instagram',
    label: 'Vitrine Digital para Link da Bio no Instagram',
  },
  { href: '/criar', label: 'Criar Vitrine Digital Grátis (15 dias de teste)' },
  { href: '/termos', label: 'Termos de Uso — VitriMini' },
  { href: '/privacidade', label: 'Política de Privacidade (LGPD) — VitriMini' },
];

function buildLandingBodyHtml(page) {
  const faqHtml = (page.faqItems || [])
    .map(
      (f) => `
        <article class="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 class="text-sm font-bold text-zinc-900">${escapeHtml(f.question)}</h3>
          <p class="mt-2 text-sm leading-relaxed text-zinc-600">${escapeHtml(f.answer)}</p>
        </article>`
    )
    .join('\n');

  const highlightsHtml = (page.highlights || [])
    .map(
      (h) => `
        <li class="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          ${escapeHtml(h)}
        </li>`
    )
    .join('\n');

  const plansHtml = COMMON_PLANS.map(
    (p) => `
        <div class="rounded-2xl border border-zinc-200 bg-white p-5">
          <h3 class="text-base font-extrabold text-zinc-900">${escapeHtml(p.name)}</h3>
          <p class="mt-1 text-sm font-bold text-rose-600">${escapeHtml(p.price)}</p>
          <p class="mt-2 text-sm text-zinc-600">${escapeHtml(p.desc)}</p>
        </div>`
  ).join('\n');

  const linksHtml = INTERNAL_LINKS.map(
    (l) =>
      `<li><a href="${escapeHtml(l.href)}" class="text-xs font-semibold text-zinc-600 hover:text-rose-600">${escapeHtml(l.label)}</a></li>`
  ).join('\n');

  return `
    <div class="min-h-screen bg-white text-zinc-900">
      <header class="border-b border-zinc-200 bg-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <a href="/" class="text-base font-extrabold text-zinc-900">VitriMini</a>
          <div class="flex items-center gap-2">
            <a href="/entrar" class="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700">Entrar</a>
            <a href="/criar" class="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white">Começar 15 dias grátis</a>
          </div>
        </div>
      </header>
      <main class="mx-auto max-w-5xl space-y-10 px-4 py-12">
        <section class="space-y-4">
          <span class="inline-block rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold text-rose-700">
            ${escapeHtml(page.badge)}
          </span>
          <h1 class="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            ${escapeHtml(page.h1)}
          </h1>
          <p class="text-base leading-relaxed text-zinc-600">
            ${escapeHtml(page.lead)}
          </p>
          <div class="pt-2">
            <a href="/criar" class="inline-flex items-center rounded-2xl bg-rose-600 px-6 py-3.5 text-sm font-bold text-white">
              Começar 15 dias grátis
            </a>
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-2xl font-extrabold text-zinc-900">Por que escolher a VitriMini</h2>
          <ul class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            ${highlightsHtml}
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-2xl font-extrabold text-zinc-900">Planos simples e transparentes (0% de comissão)</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            ${plansHtml}
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-2xl font-extrabold text-zinc-900">Perguntas Frequentes</h2>
          <div class="space-y-3">
            ${faqHtml}
          </div>
        </section>
      </main>
      <footer class="border-t border-zinc-200 bg-zinc-50 py-8">
        <div class="mx-auto max-w-5xl px-4">
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-zinc-900">Soluções VitriMini</h2>
          <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            ${linksHtml}
          </ul>
          <p class="mt-6 text-xs text-zinc-500">© 2026 VitriMini. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>`.trim();
}

function buildLegalBodyHtml(page) {
  const sectionsHtml = page.sections
    .map(
      (s) => `
        <section class="space-y-2">
          <h2 class="text-base font-extrabold text-zinc-900">${escapeHtml(s.heading)}</h2>
          <p class="text-sm leading-relaxed text-zinc-600">${escapeHtml(s.body)}</p>
        </section>`
    )
    .join('\n');

  const linksHtml = INTERNAL_LINKS.map(
    (l) =>
      `<li><a href="${escapeHtml(l.href)}" class="text-xs font-semibold text-zinc-600 hover:text-rose-600">${escapeHtml(l.label)}</a></li>`
  ).join('\n');

  return `
    <div class="min-h-screen bg-zinc-50 text-zinc-900">
      <header class="border-b border-zinc-200 bg-white">
        <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <a href="/" class="text-base font-extrabold text-zinc-900">VitriMini</a>
          <a href="/" class="text-xs font-semibold text-zinc-600">Voltar ao início</a>
        </div>
      </header>
      <main class="mx-auto max-w-3xl px-4 py-8">
        <article class="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10">
          <div>
            <span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Atualizado em Novembro de 2026</span>
            <h1 class="mt-3 text-2xl font-extrabold text-zinc-900 sm:text-3xl">${escapeHtml(page.h1)}</h1>
            <p class="mt-1 text-sm text-zinc-500">${escapeHtml(page.subtitle)}</p>
          </div>
          <div class="space-y-5 border-t border-zinc-100 pt-6">
            ${sectionsHtml}
          </div>
        </article>
      </main>
      <footer class="border-t border-zinc-200 bg-white py-6">
        <div class="mx-auto max-w-3xl px-4">
          <ul class="flex flex-wrap gap-x-4 gap-y-2">
            ${linksHtml}
          </ul>
        </div>
      </footer>
    </div>`.trim();
}

const ROUTES = [
  {
    path: '/',
    title: 'VitriMini | Catálogo Online e Pedidos pelo WhatsApp',
    description:
      'Crie sua vitrine digital e catálogo online com pedidos organizados no WhatsApp, sinal no Pix e 0% de comissão. Teste grátis por 15 dias e planos a partir de R$ 24,90.',
    type: 'landing',
    badge: '15 dias grátis na 1ª vitrine • 0% de comissão • Cancele quando quiser',
    h1: 'Catálogo Online e Vitrine Digital com Pedidos no WhatsApp',
    lead: 'Chega de mandar PDF pesado e responder preço o dia inteiro. Sua primeira vitrine entra no ar hoje com 15 dias grátis e, para continuar depois, planos a partir de R$ 24,90 por 90 dias com 0% de comissão.',
    highlights: [
      'Pedidos organizados no WhatsApp com itens, quantidades, data/turno e entrega ou retirada já somados.',
      'Cálculo automático de sinal via Pix com 0% de comissão da plataforma e acompanhamento do pedido em tempo real.',
      'Plano Essencial (R$ 24,90 por 90 dias) ou Plano Pro com Mercado Pago integrado (R$ 39,90 por 90 dias ou R$ 99,90/ano).',
    ],
    faqItems: [
      {
        question: 'Como funcionam os 15 dias grátis na primeira vitrine?',
        answer:
          'Ao criar sua primeira vitrine na VitriMini, ela já entra no ar imediatamente por 15 dias grátis para você testar na prática com seus clientes. Se quiser continuar depois desse prazo, basta escolher um dos planos disponíveis na tela de assinatura.',
      },
      {
        question: 'Como funcionam a contratação, os meios de pagamento e a renovação dos planos?',
        answer:
          'A contratação pode ser feita nas modalidades avulsa ou recorrente, conforme os meios de pagamento disponíveis na tela de assinatura no momento da contratação. Caso opte pela assinatura recorrente, o cancelamento é simples e pode ser feito a qualquer momento pelo próprio painel, sem multa.',
      },
      {
        question: 'Vocês cobram alguma taxa sobre as encomendas que eu vender?',
        answer:
          'Zero comissão. Todo o valor das suas vendas e o sinal pago pelos seus clientes caem diretamente na sua conta usando a sua própria chave Pix.',
      },
      {
        question: 'Como meu cliente acompanha o status do pedido? Precisa baixar app?',
        answer:
          'Não precisa baixar nenhum aplicativo. Assim que você registra ou atualiza o pedido, um link exclusivo de acompanhamento em tempo real é gerado para o cliente ver cada etapa direto no navegador.',
      },
    ],
  },
  {
    path: '/cardapio-digital-whatsapp',
    title: 'Cardápio Digital para WhatsApp sem Taxas por Pedido | VitriMini',
    description:
      'Crie seu cardápio digital para WhatsApp ideal para lanchonetes, marmitarias e delivery. Receba pedidos prontos com 0% de comissão e 15 dias grátis.',
    type: 'landing',
    badge: 'Ideal para Lanchonetes, Marmitarias e Delivery • 0% de comissão',
    h1: 'Cardápio Digital para WhatsApp sem Taxas por Pedido',
    lead: 'Organize os pedidos da sua lanchonete, marmitaria ou delivery sem pagar comissão para aplicativos. O cliente escolhe os itens no celular, informa entrega ou retirada e o pedido já chega somado no seu WhatsApp.',
    highlights: [
      'Link leve que abre em 1 segundo direto no WhatsApp ou Instagram da sua lanchonete ou marmitaria.',
      'Pedido chega formatado com itens, endereço de entrega, forma de pagamento e link de status em tempo real.',
      'Pause pratos ou lanches esgotados em 1 clique no meio do expediente sem apagar o produto.',
    ],
    faqItems: [
      {
        question: 'A VitriMini cobra porcentagem sobre os pedidos do meu delivery?',
        answer:
          'Não. Cobramos 0% de comissão sobre suas vendas. Todo o dinheiro dos pedidos vai 100% para você, seja via Pix direto na sua chave ou pagamento online integrado ao seu Mercado Pago no Plano Pro.',
      },
      {
        question: 'Consigo pausar um prato ou lanche que acabou no meio do expediente?',
        answer:
          'Sim! No painel da sua vitrine você marca qualquer item como "Esgotado" em 1 clique, sem precisar apagar a foto nem o cadastro do produto.',
      },
      {
        question: 'O cliente consegue escolher entre entrega (delivery) e retirada no balcão?',
        answer:
          'Sim. Ao finalizar o pedido, o cliente seleciona Entrega (preenchendo o endereço completo) ou Retirada no local, além do turno ou horário disponível.',
      },
      {
        question: 'Tem fidelidade ou multa para usar o cardápio digital?',
        answer:
          'Não há fidelidade nem multa de cancelamento. Você testa grátis por 15 dias na primeira vitrine e, quando quiser continuar, escolhe o plano na modalidade avulsa ou recorrente disponível na tela de assinatura, com cancelamento simples pelo painel.',
      },
    ],
  },
  {
    path: '/catalogo-online-roupas',
    title:
      'Catálogo Online para Loja de Roupas e Moda com Pedidos no WhatsApp | VitriMini',
    description:
      'Monte seu catálogo online para loja de roupas, calçados e acessórios. Divulgue no Instagram e receba pedidos organizados no WhatsApp com 0% de comissão.',
    type: 'landing',
    badge: 'Para Lojas de Roupas, Calçados e Acessórios • 15 dias grátis',
    h1: 'Catálogo Online para Loja de Roupas e Moda',
    lead: 'Transforme suas seguidoras em clientes com um catálogo online elegante e rápido. Exiba fotos das peças, preços e tamanhos na descrição, pause peças únicas vendidas em 1 toque e receba os pedidos prontos no WhatsApp.',
    highlights: [
      'Vitrine com a cor da sua marca para colocar na bio do Instagram e enviar para suas clientes.',
      'Cliente escolhe as peças no carrinho, informa tamanho/cor nas observações e fecha no WhatsApp.',
      'No Plano Pro, aceite Pix e Cartão automaticamente direto na sua conta Mercado Pago com 0% de comissão da VitriMini.',
    ],
    faqItems: [
      {
        question: 'Posso cadastrar quantas roupas, calçados ou acessórios no catálogo?',
        answer:
          'O cadastro de produtos é ilimitado em todos os planos. Você pode adicionar quantas peças e coleções quiser com foto, descrição (tamanhos, cores e tecido) e preço.',
      },
      {
        question: 'Como faço quando uma peça única ou tamanho esgota?',
        answer:
          'Basta tocar no botão "Esgotado" do produto no seu painel. A peça continua visível na vitrine com o selo de esgotada (ou você pode editá-la quando chegar reposição).',
      },
      {
        question: 'Posso aceitar cartão de crédito e Pix automático na minha loja de roupas?',
        answer:
          'Sim! No Plano Pro (R$ 39,90 por 90 dias ou R$ 99,90 por ano), você conecta sua própria conta do Mercado Pago e recebe Pix e Cartão automaticamente, com 0% de taxa da VitriMini.',
      },
      {
        question: 'Como funciona após os 15 dias grátis?',
        answer:
          'Você cria e publica sua primeira vitrine com 15 dias grátis para testar à vontade. Depois desse período, basta escolher um dos planos na modalidade avulsa ou recorrente disponíveis na tela de assinatura, com cancelamento simples pelo painel.',
      },
    ],
  },
  {
    path: '/vitrine-digital-confeitaria',
    title:
      'Vitrine Digital e Link de Pedidos para Confeitaria e Encomendas | VitriMini',
    description:
      'Crie sua vitrine digital para confeitaria, bolos, doces e datas comemorativas. Calcule sinal de 50% no Pix automaticamente e organize encomendas no WhatsApp.',
    type: 'landing',
    badge: 'Feito para Confeitarias, Bolos, Doces e Datas Comemorativas',
    h1: 'Vitrine Digital e Link de Pedidos para Confeitaria',
    lead: 'Pare de perder tempo calculando sinal e conferindo agenda entre uma fornada e outra. Configure suas datas e turnos disponíveis, exiba o valor do sinal via Pix automaticamente e receba encomendas prontas no WhatsApp.',
    highlights: [
      'Agenda inteligente: o cliente só escolhe entre as datas e turnos (manhã/tarde) que você liberar.',
      'Cálculo automático do sinal (ex.: 50%) com botão para o cliente copiar sua chave Pix na hora.',
      'Ideal para bolos sob encomenda, kits festa e cardápios de Páscoa, Dia das Mães e Natal.',
    ],
    faqItems: [
      {
        question: 'Como funciona o cálculo automático de sinal no Pix para encomendas?',
        answer:
          'Você define a porcentagem de sinal desejada (por exemplo, 50%). Quando o cliente monta a encomenda, a vitrine já mostra o valor exato do sinal para reservar e exibe sua chave Pix pronta para copiar.',
      },
      {
        question: 'Consigo limitar quais dias e turnos aceito encomendas?',
        answer:
          'Sim! Você pode cadastrar datas específicas (como véspera de Natal ou Páscoa) ou dias da semana recorrentes com turnos (Manhã, Tarde, Noite), evitando pedidos fora da sua agenda.',
      },
      {
        question: 'O cliente pode escrever observações, como frase no topo do bolo?',
        answer:
          'Sim. Na finalização da encomenda há um campo de observações onde o cliente informa detalhes como escrita no bolo, restrições ou preferências, e tudo chega junto no seu WhatsApp e no painel.',
      },
      {
        question: 'Tem taxa por encomenda recebida?',
        answer:
          'Nenhuma. A VitriMini cobra 0% de comissão. O pagamento do cliente vai direto para a sua conta bancária.',
      },
    ],
  },
  {
    path: '/link-pedidos-instagram',
    title:
      'Vitrine Digital para Link da Bio no Instagram e Pedidos no WhatsApp | VitriMini',
    description:
      'Coloque uma vitrine digital no link da bio do Instagram e transforme seguidores em pedidos organizados no WhatsApp. 15 dias grátis e 0% de comissão.',
    type: 'landing',
    badge: 'Do Link da Bio direto para o seu WhatsApp • Sem comissão',
    h1: 'Vitrine Digital para Link da Bio no Instagram',
    lead: 'Substitua listas de links confusas por uma vitrine digital rápida que vende por você 24 horas por dia. Seu seguidor clica no link da bio, monta o carrinho em segundos e envia o pedido pronto para o seu WhatsApp.',
    highlights: [
      'Catálogo sempre atualizado com fotos, preços e carrinho de compras que abre direto no navegador do Instagram.',
      'O cliente já chega no seu WhatsApp com o pedido decidido, somado e pronto para pagar.',
      'Gera cartão com QR Code exclusivo da sua vitrine para imprimir em embalagens, sacolas e balcão.',
    ],
    faqItems: [
      {
        question: 'Por que usar uma vitrine na bio em vez de um link direto para o WhatsApp?',
        answer:
          'Quando o link abre apenas a conversa vazia no WhatsApp, o cliente precisa perguntar preços e esperar resposta. Com a VitriMini na bio, ele vê fotos e valores na hora, monta o carrinho sozinho e já envia o pedido fechado.',
      },
      {
        question: 'Posso personalizar a vitrine com a logo e a cor do meu Instagram?',
        answer:
          'Sim! Você envia a logo da sua loja e escolhe a paleta de cores que combina com a identidade visual da sua marca.',
      },
      {
        question: 'Meus seguidores precisam instalar algum aplicativo para comprar?',
        answer:
          'Não. A vitrine abre direto no navegador do celular em 1 clique, tanto pelo Instagram quanto pelo WhatsApp.',
      },
      {
        question: 'Como funciona o pagamento da plataforma?',
        answer:
          'Você tem 15 dias grátis na primeira vitrine para testar à vontade. Depois, se quiser continuar, escolhe o plano a partir de R$ 24,90 por 90 dias na modalidade avulsa ou recorrente disponível na tela de assinatura, com cancelamento simples pelo painel.',
      },
    ],
  },
  {
    path: '/termos',
    title: 'Termos de Uso — VitriMini',
    description:
      'Condições gerais de contratação, planos avulsos ou recorrentes, regra de upgrade e responsabilidades no uso da plataforma SaaS VitriMini.',
    type: 'legal',
    h1: 'Termos de Uso — VitriMini',
    subtitle:
      'Condições gerais de contratação, planos e uso da plataforma SaaS (Versão 1.1)',
    sections: [
      {
        heading: '1. Identificação, Aceite e Natureza do Serviço (SaaS)',
        body: 'A VitriMini atua exclusivamente como fornecedora de software (SaaS) para criação de catálogo digital e organização de pedidos, não sendo intermediadora financeira, marketplace, transportadora ou vendedora, e cobrando 0% de comissão sobre as vendas.',
      },
      {
        heading: '2. Teste Gratuito de 15 Dias e Planos (Avulsos ou Recorrentes)',
        body: 'Teste gratuito de 15 dias na 1ª vitrine. Planos contratados na modalidade avulsa ou recorrente via Pix ou Cartão, conforme opções da tela de assinatura: Plano Essencial (R$ 24,90 por 90 dias), Plano Pro Trimestral (R$ 39,90 por 90 dias) e Plano Pro Anual (R$ 99,90 por 365 dias), com cancelamento simples pelo painel. No upgrade do Essencial para o Pro, o acesso Pro é liberado imediatamente (incluindo VitriLink e Mercado Pago) e os novos dias são somados integralmente ao saldo restante.',
      },
      {
        heading: '3. Cancelamento e Direito de Arrependimento (CDC)',
        body: 'Direito de arrependimento em até 7 dias corridos da contratação inicial conforme o art. 49 do CDC pelo e-mail suporte@vitrimini.com.br, desde que não haja uso abusivo. Após esse prazo ou em caso de bloqueio por violação dos Termos, não há reembolso proporcional de dias não utilizados.',
      },
      {
        heading: '4. Pagamentos Diretos ao Lojista (Mercado Pago) e Responsabilidades',
        body: 'No Plano Pro, a integração com o Mercado Pago ocorre diretamente entre a conta do lojista e o consumidor final. O lojista é o único responsável pela entrega, qualidade, cumprimento do CDC, notas fiscais, chargebacks e execução integral de estornos/reembolsos em caso de cancelamento de pedidos pagos.',
      },
      {
        heading: '5. Uso Aceitável e Suspensão Imediata',
        body: 'É proibida a venda de produtos ilícitos, falsificados, restritos por lei, golpes ou fraudes, autorizando a VitriMini a suspender ou excluir a vitrine imediatamente, sem aviso prévio e sem reembolso, cooperando com autoridades competentes.',
      },
    ],
  },
  {
    path: '/privacidade',
    title: 'Política de Privacidade (LGPD) — VitriMini',
    description:
      'Transparência sobre o tratamento, segurança e proteção de dados pessoais na plataforma VitriMini em conformidade com a LGPD.',
    type: 'legal',
    h1: 'Política de Privacidade (LGPD) — VitriMini',
    subtitle:
      'Transparência sobre o tratamento, segurança e proteção de dados pessoais (Versão 1.1)',
    sections: [
      {
        heading: '1. Papéis na LGPD: Controladora da Plataforma x Controlador da Vitrine',
        body: 'A VitriMini é Controladora dos dados cadastrais dos lojistas e das contas de acesso dos clientes na plataforma. O lojista vendedor é Controlador autônomo dos dados de entrega e histórico de pedidos realizados em sua respectiva vitrine.',
      },
      {
        heading: '2. Dados Coletados e Criptografia',
        body: 'Coletamos nome, e-mail, telefone/WhatsApp, senha criptografada com hash bcrypt, logs de aceite de termos com data/hora e metadados técnicos de pagamento (incluindo recursos como VitriLink). O processamento de cartão de crédito segue padrão PCI-DSS via Mercado Pago; a VitriMini não armazena dados completos de cartão e mantém tokens de integração Mercado Pago criptografados em repouso (AES-256-GCM).',
      },
      {
        heading: '3. Operadores e Subcontratados Essenciais',
        body: 'Compartilhamos apenas o estritamente necessário com provedores de hospedagem e banco de dados em nuvem, armazenamento de imagens (Cloudflare R2), envio de e-mails transacionais (Brevo) e processamento de pagamentos (Mercado Pago).',
      },
      {
        heading: '4. Direitos do Titular (LGPD) e Contato',
        body: 'O titular pode solicitar acesso, confirmação, correção, exclusão de conta e revogação de consentimento a qualquer momento pelo canal oficial: suporte@vitrimini.com.br.',
      },
    ],
  },
];

function buildJsonLd(route) {
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const baseOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VitriMini',
    url: `${SITE_URL}/`,
    logo: OG_IMAGE,
  };

  if (route.type === 'legal') {
    return [
      baseOrg,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: route.title,
        description: route.description,
        url: canonicalUrl,
        inLanguage: 'pt-BR',
      },
    ];
  }

  return [
    baseOrg,
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'VitriMini',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      url: canonicalUrl,
      description: route.description,
      offers: {
        '@type': 'Offer',
        price: '24.90',
        priceCurrency: 'BRL',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (route.faqItems || []).map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    },
  ];
}

function renderRouteHtml(templateHtml, route) {
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const escapedTitle = escapeHtml(route.title);
  const escapedDesc = escapeHtml(route.description);
  const jsonLdString = JSON.stringify(buildJsonLd(route), null, 2);
  const bodyContent =
    route.type === 'legal'
      ? buildLegalBodyHtml(route)
      : buildLandingBodyHtml(route);

  let html = templateHtml;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapedTitle}</title>`
  );

  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapedDesc}" />`
  );

  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapedTitle}" />`
  );

  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapedDesc}" />`
  );

  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapedTitle}" />`
  );

  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapedDesc}" />`
  );

  html = html.replace(
    /<script\s+id="vitrimini-jsonld"\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script id="vitrimini-jsonld" type="application/ld+json">\n${jsonLdString}\n    </script>`
  );

  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${bodyContent}</div>`
  );

  return html;
}

function run() {
  if (!fs.existsSync(baseIndexPath)) {
    throw new Error(
      `[prerender] Arquivo ${baseIndexPath} não encontrado. Rode "vite build" antes.`
    );
  }

  const templateHtml = fs.readFileSync(baseIndexPath, 'utf-8');

  for (const route of ROUTES) {
    const renderedHtml = renderRouteHtml(templateHtml, route);

    if (route.path === '/') {
      fs.writeFileSync(baseIndexPath, renderedHtml, 'utf-8');
      console.log('[prerender] Gerado: dist/index.html');
    } else {
      const cleanRoute = route.path.replace(/^\/+/, '');
      const targetDir = path.join(distDir, cleanRoute);
      fs.mkdirSync(targetDir, { recursive: true });
      const targetFile = path.join(targetDir, 'index.html');
      fs.writeFileSync(targetFile, renderedHtml, 'utf-8');
      console.log(`[prerender] Gerado: dist/${cleanRoute}/index.html`);
    }
  }
}

run();
