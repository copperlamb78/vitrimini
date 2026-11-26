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
    price: 'R$ 0,00 por 15 dias sem cartão',
    desc: 'Sua primeira vitrine entra no ar na hora por 15 dias grátis sem precisar cadastrar cartão, com 0% de comissão e sem cobrança automática.',
  },
  {
    name: 'Plano Essencial • Mensal',
    price: 'R$ 9,90 / mês',
    desc: 'Produtos ilimitados, catálogo e carrinho no WhatsApp, agendamento por data e turno, cálculo de sinal via Pix e 0% de comissão. Pague com Pix Avulso ou Cartão Recorrente.',
  },
  {
    name: 'Plano Pro • Pagamento Automático + VitriLink',
    price: 'R$ 14,90 / mês (apenas R$ 5,00 a mais) ou R$ 149,00 / ano (2 meses grátis)',
    desc: 'Tudo do Essencial + VitriLink para bio do Instagram/TikTok + Mercado Pago direto (Pix e Cartão com baixa automática). Escolha Pix Avulso ou Cartão com renovação por aniversário no calendário.',
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
    title:
      'VitriMini | Vitrine Digital, Catálogo Online para WhatsApp e Link na Bio',
    description:
      'Crie sua vitrine digital e catálogo online para WhatsApp com VitriLink na bio, agendamento por data e turno, pagamento online via Mercado Pago e 0% de comissão. 15 dias grátis sem cartão. Planos a partir de R$ 9,90/mês (Pro R$ 14,90/mês ou R$ 149,00/ano).',
    type: 'landing',
    badge: '15 dias grátis sem cartão na 1ª vitrine • 0% de comissão',
    h1: 'Vitrine Digital e Catálogo Online para WhatsApp e Link na Bio — Venda sem Comissão',
    lead: 'Chega de mandar PDF pesado e responder preço o dia inteiro. Publique sua vitrine digital com 15 dias grátis sem cartão, VitriLink na bio, agendamento por data e turno, pagamento online via Mercado Pago e 0% de comissão.',
    highlights: [
      'Catálogo + Carrinho no WhatsApp com pedidos organizados no painel, agendamento por data e turno e entrega ou retirada.',
      'VitriLink para bio do Instagram e TikTok + Pagamento Online Direto via Mercado Pago (Pix e Cartão com baixa automática no Plano Pro).',
      'Escolha entre Pix (sem renovação automática) ou Cartão de Crédito (cobrança todo mês ou ano no mesmo dia, com cancelamento direto no painel).',
    ],
    faqItems: [
      {
        question: 'Como funcionam os 15 dias grátis sem cartão na primeira vitrine?',
        answer:
          'Ao criar sua primeira vitrine na VitriMini, ela já entra no ar imediatamente por 15 dias grátis, sem precisar cadastrar cartão de crédito e sem cobrança automática ao final do teste. Se quiser continuar depois desse prazo, basta escolher um plano na tela de assinatura.',
      },
      {
        question: 'Quais são os planos e como posso pagar?',
        answer:
          'Você escolhe entre Essencial (R$ 9,90/mês), Pro Mensal (R$ 14,90/mês) ou Pro Anual (R$ 149,00/ano, com 2 meses grátis). Pode pagar no Pix (sem renovação automática) ou no Cartão de Crédito (com renovação mensal ou anual e cancelamento direto no painel, sem multa).',
      },
      {
        question: 'Como funciona a data de vencimento dos planos?',
        answer:
          'A cobrança ou vencimento acontece todo mês ou ano no mesmo dia em que você contratou. Se assinar no dia 15, por exemplo, o próximo vencimento será no dia 15 do mês seguinte (no mensal) ou do ano seguinte (no anual).',
      },
      {
        question:
          'Se eu assinar um plano antes de acabar os 15 dias grátis, eu perco os dias que faltavam?',
        answer:
          'De jeito nenhum! O tempo do plano é somado a partir da data em que seus 15 dias grátis iam vencer — ao contratar um plano mensal, por exemplo, você aproveita os dias restantes do teste somados ao novo período completo no ar.',
      },
      {
        question: 'Vocês cobram alguma comissão sobre as vendas da minha vitrine?',
        answer:
          'Zero comissão. Todo o valor das suas vendas vai 100% para você, direto na sua conta pela sua própria chave Pix ou pela sua conta do Mercado Pago conectada no Plano Pro.',
      },
      {
        question: 'O que vem no Plano Pro com VitriLink e Mercado Pago?',
        answer:
          'Por apenas R$ 5,00 a mais por mês em relação ao Essencial, o Plano Pro libera o VitriLink (sua página de links para a bio do Instagram e TikTok com capa e cartões com foto) e a integração direta com o Mercado Pago para receber via Pix e Cartão de Crédito com confirmação e baixa automática no painel.',
      },
      {
        question:
          'Como meu cliente acompanha o status do pedido? Precisa baixar app?',
        answer:
          'Não precisa baixar nenhum aplicativo. Assim que o pedido é feito, um link exclusivo de acompanhamento em tempo real é gerado para o cliente ver cada etapa (Recebido, Em preparo, Pronto ou Saiu para entrega) direto no navegador.',
      },
      {
        question:
          'Consigo alterar preços, datas e turnos ou marcar um produto como esgotado?',
        answer:
          'Sim. Pelo painel da vitrine você pode pausar itens esgotados em 1 toque, mudar preços, configurar agendamento por data e turno para entregas ou retiradas e adicionar novos produtos quando quiser.',
      },
      {
        question:
          'Existe limite de quantos produtos posso cadastrar na minha vitrine?',
        answer:
          'Não há limite. Você pode cadastrar quantos doces, marmitas, roupas, kits ou produtos sob encomenda desejar, todos com foto, descrição e preço.',
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
          'Sim! No Plano Pro (R$ 14,90/mês ou R$ 149,00/ano), você conecta sua própria conta do Mercado Pago e recebe Pix e Cartão automaticamente, com 0% de taxa da VitriMini.',
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
          'Você tem 15 dias grátis na primeira vitrine para testar à vontade. Depois, se quiser continuar, escolhe um dos planos disponíveis na tela de assinatura.',
      },
    ],
  },
  {
    path: '/termos',
    title: 'Termos de Uso — VitriMini',
    description:
      'Condições gerais de contratação avulsa via Pix ou assinatura recorrente via cartão com vencimento por aniversário de calendário, regra de upgrade, cancelamento pelo painel, arrependimento e DPA na VitriMini.',
    type: 'legal',
    h1: 'Termos de Uso — VitriMini',
    subtitle:
      'Condições gerais de contratação avulsa ou recorrente, uso da plataforma SaaS e Acordo de Tratamento de Dados (Versão 2.3 • Vigência: 25 de novembro de 2026)',
    sections: [
      {
        heading: '1. Identificação do Fornecedor (Decreto nº 7.962/2013) e Aceite',
        body: 'Operada por Antonio Gabriel Gomes Falcão do Nascimento (VitriMini / NeoDevZone), com suporte oficial em suporte@vitrimini.com.br. A VitriMini fornece exclusivamente software (SaaS) para catálogo digital e organização de pedidos, cobrando 0% de comissão sobre as vendas realizadas pelos Lojistas.',
      },
      {
        heading: '2. Avaliação Gratuita (15 dias), Pix Avulso, Cartão Recorrente e Upgrade',
        body: 'Avaliação gratuita de 15 dias na primeira vitrine, sem cartão prévio, sem cobrança automática e sem geração de dívida ao término. Os planos pagos (Essencial Mensal R$ 9,90/mês, Pro Mensal R$ 14,90/mês e Pro Anual R$ 149,00/ano) operam em duas modalidades: Pix Avulso (pagamento único por ciclo, sem renovação automática) e Assinatura Recorrente via Cartão de Crédito (Mercado Pago /preapproval, mediante autorização expressa antes da confirmação, com renovação automática mensal ou anual sempre no mesmo dia da contratação por aniversário de data no calendário e cancelamento direto pelo painel com bloqueio imediato de futuras cobranças e acesso mantido até o fim do período já pago). Em upgrades ou trocas de modalidade, eventual assinatura anterior ativa é cancelada automaticamente após a confirmação do novo pagamento, e no upgrade somam-se os dias restantes ao novo prazo.',
      },
      {
        heading: '3. Expiração (30 dias) e Direito de Arrependimento (Art. 49 do CDC)',
        body: 'Após 30 dias da expiração sem renovação, rotina automatizada remove os dados operacionais da vitrine, pedidos e imagens no Cloudflare R2, ressalvadas hipóteses legais e ciclos de backups em nuvem. O direito de arrependimento é garantido em até 7 dias corridos da contratação diretamente pelo painel ou via suporte@vitrimini.com.br, preservando tempestividade para solicitações em finais de semana ou feriados.',
      },
      {
        heading: '4. Pagamentos Diretos ao Lojista (Mercado Pago) e Responsabilidades',
        body: 'Os pagamentos via Pix ou Mercado Pago (OAuth) caem 100% diretamente na conta do Lojista, que responde pela entrega, qualidade, notas fiscais, estornos e chargebacks, enquanto a VitriMini responde pelo funcionamento técnico da plataforma e segurança dos dados sob sua custódia.',
      },
      {
        heading: '5. Uso Aceitável, Foro e Acordo de Tratamento de Dados (DPA)',
        body: 'Proibido o uso para produtos ilícitos, fraudes ou violação de direitos autorais, sujeito a suspensão preventiva com direito a contestação. Foro de Feira de Santana – BA, ressalvado o domicílio do consumidor quando aplicável. Inclui Anexo de DPA entre Lojista (Controlador) e VitriMini (Operadora).',
      },
    ],
  },
  {
    path: '/privacidade',
    title: 'Política de Privacidade (LGPD) — VitriMini',
    description:
      'Transparência sobre o tratamento, bases legais, cookies, suboperadores e proteção de dados pessoais na plataforma VitriMini em conformidade com a LGPD.',
    type: 'legal',
    h1: 'Política de Privacidade (LGPD) — VitriMini',
    subtitle:
      'Transparência sobre o tratamento, bases legais, cookies, suboperadores e proteção de dados pessoais (Versão 2.3 • Vigência: 25 de novembro de 2026)',
    sections: [
      {
        heading: '1. Papéis na LGPD e Enquadramento ANPD (Res. nº 2/2022)',
        body: 'A VitriMini atua como Controladora para contas de lojistas, autenticação e segurança própria, e como Operadora para vitrines e pedidos em nome do Lojista (Controlador). Enquadrada como agente de pequeno porte (Resolução CD/ANPD nº 2/2022), mantém canal direto com titulares em suporte@vitrimini.com.br.',
      },
      {
        heading: '2. Dados Coletados, Segurança Técnica e Delimitação PCI-DSS',
        body: 'Coletamos dados cadastrais do lojista, chave Pix (exibição na vitrine), tokens OAuth do Mercado Pago (AES-256-GCM) e dados de pedidos. Senhas usam hash bcrypt e refresh tokens usam SHA-256 em cookie HttpOnly. Tanto no Pix Avulso quanto na Assinatura Recorrente via Cartão de Crédito, a VitriMini redireciona para o checkout hospedado do Mercado Pago (init_point), não possui certificação PCI-DSS própria e não coleta nem armazena números de cartão ou CVV, armazenando apenas o identificador da assinatura (mpPreapprovalId), status e histórico técnico de cobranças (CatalogPayment), sem gravar tabela própria de logs históricos de acesso IP + data/hora no banco.',
      },
      {
        heading: '3. Cookies, Armazenamento Local e Suboperadores',
        body: 'Sem cookies publicitários nem scripts de analytics/pixel. Utiliza apenas cookies HttpOnly necessários (vitrimini_refresh_token e mp_oauth_nonce) e storage local essencial. Suboperadores: Supabase (Brasil), Render, Cloudflare (CDN/R2), Mercado Pago, Brevo e Zoho Mail, com salvaguardas compatíveis com a LGPD e a Resolução CD/ANPD nº 19/2024.',
      },
      {
        heading: '4. Retenção, Direitos do Titular (Art. 18) e Incidentes',
        body: 'Exclusão automatizada após 30 dias da expiração sem renovação, ressalvadas hipóteses legais e ciclos de backups. Atendimento aos direitos do Art. 18 da LGPD em até 15 dias pelo e-mail suporte@vitrimini.com.br e comunicação de incidentes conforme a Resolução CD/ANPD nº 15/2024.',
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
        '@type': 'AggregateOffer',
        lowPrice: '9.90',
        highPrice: '149.00',
        priceCurrency: 'BRL',
        offerCount: '3',
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
  const jsonLdString = JSON.stringify(buildJsonLd(route), null, 2).replace(
    /</g,
    '\\u003c'
  );
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
