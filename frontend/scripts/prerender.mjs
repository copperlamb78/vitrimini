import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const publicDir = path.resolve(__dirname, '../public');
const baseIndexPath = path.join(distDir, 'index.html');

const SITE_URL = 'https://vitrimini.com.br';
const OG_IMAGE = `${SITE_URL}/og-cover.png?v=20261126`;
const SITEMAP_LASTMOD = '2026-11-26';

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
    .map((h) => {
      if (typeof h === 'string') {
        return `
        <li class="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          ${escapeHtml(h)}
        </li>`;
      }
      return `
        <li class="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 class="text-sm font-bold text-zinc-900">${escapeHtml(h.title)}</h3>
          <p class="mt-1 text-sm text-zinc-600">${escapeHtml(h.description)}</p>
        </li>`;
    })
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
    priority: '1.0',
    changefreq: 'weekly',
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
    priority: '0.9',
    changefreq: 'weekly',
    title: 'Cardápio Digital para WhatsApp sem Taxa de Delivery | VitriMini',
    description:
      'Substitua o PDF pesado na sua marmitaria, hamburgueria ou lanchonete. Cardápio digital para WhatsApp com turnos de almoço/jantar, pausa em 1 clique e 0% de comissão.',
    type: 'landing',
    badge: 'Para Marmitarias, Hamburguerias e Delivery • 0% de comissão por pedido',
    h1: 'Cardápio Digital para WhatsApp sem Taxas por Pedido',
    lead: 'Pare de perder até 27% do faturamento em aplicativos de entrega. Na sua marmitaria ou lanchonete, o cliente escolhe Marmita Executiva ou Combo Smash Burger no celular, seleciona entrega ou retirada e envia o pedido somado no seu WhatsApp.',
    highlights: [
      {
        title: 'Turnos de Almoço e Jantar sob controle',
        description:
          'Libere horários específicos para marmitas do dia ou pedidos noturnos e evite fila desorganizada na cozinha.',
      },
      {
        title: 'Pedido pronto e sem erro de troco',
        description:
          'O resumo chega no WhatsApp com itens, observações, endereço completo e pagamento (Pix ou Mercado Pago).',
      },
      {
        title: 'Acompanhamento sem baixar app',
        description:
          'Seu cliente vê pelo link quando o pedido passou para Em preparo, Pronto para retirada ou Saiu para entrega.',
      },
    ],
    faqItems: [
      {
        question: 'Quanto a VitriMini desconta de cada marmita ou lanche vendido?',
        answer:
          'Zero. A VitriMini cobra 0% de comissão sobre o seu faturamento. Se você vendeu R$ 3.000 no mês pelo cardápio, os R$ 3.000 ficam integralmente com a sua cozinha.',
      },
      {
        question: 'Consigo pausar um prato do dia que acabou às 13h sem refazer o cardápio?',
        answer:
          'Sim. No painel pelo celular você toca em "Esgotado" no item específico — como Marmita de Strogonoff ou Batata Cheddar — e ele sai de venda na hora, mantendo foto e preço salvos para amanhã.',
      },
      {
        question: 'Dá para separar horários de almoço e jantar no delivery?',
        answer:
          'Sim. Você configura seus dias e turnos de atendimento (por exemplo, Almoço 11h às 14h e Jantar 18h às 22h30) e o cliente escolhe entre entrega no endereço ou retirada no balcão.',
      },
      {
        question: 'Como o cliente acompanha se o motoboy já saiu com o pedido?',
        answer:
          'Todo pedido gera um código de acompanhamento no navegador. Ao mudar a etapa no seu painel para "Em preparo" ou "Saiu para entrega", a tela do cliente atualiza automaticamente sem precisar mandar áudio.',
      },
      {
        question: 'Preciso cadastrar cartão de crédito para testar os 15 dias grátis?',
        answer:
          'Não. Sua primeira vitrine entra no ar por 15 dias grátis sem cartão e sem cobrança automática. Depois, você escolhe entre Essencial (R$ 9,90/mês) ou Pro (R$ 14,90/mês ou R$ 149,00/ano) no Pix ou Cartão.',
      },
    ],
  },
  {
    path: '/catalogo-online-roupas',
    priority: '0.9',
    changefreq: 'weekly',
    title: 'Catálogo Online para Loja de Roupas, Calçados e Acessórios | VitriMini',
    description:
      'Mostre looks, numerações e coleções sem mandar 30 fotos no WhatsApp. Catálogo online de moda com baixa automática no Mercado Pago e 0% de comissão.',
    type: 'landing',
    badge: 'Para Lojas de Moda Feminina, Calçados e Semijoias • 15 dias grátis',
    h1: 'Catálogo Online para Loja de Roupas e Moda',
    lead: 'Chega de passar a tarde enviando dezenas de fotos soltas no WhatsApp. Exiba Vestido Midi Linho, Tênis Casual ou Kits de Semijoias com preço visível, pause peças únicas em 1 toque e receba no Pix ou Cartão direto na sua conta.',
    highlights: [
      {
        title: 'Peça única vendida? Pause em 1 segundo',
        description:
          'Evite constrangimento de vender o último Vestido ou Sandália duas vezes marcando o item como esgotado direto do caixa.',
      },
      {
        title: 'Retirada na loja ou envio por motoboy',
        description:
          'A cliente escolhe receber em casa ou buscar a sacola no turno da tarde na sua loja física ou ateliê.',
      },
      {
        title: 'Pix e Cartão sem taxa extra da vitrine',
        description:
          'No Plano Pro, conecte seu Mercado Pago e ofereça pagamento online na hora com 0% de comissão da VitriMini.',
      },
    ],
    faqItems: [
      {
        question: 'Há limite de peças, coleções ou fotos que posso subir no catálogo?',
        answer:
          'Não. Todos os planos permitem cadastrar produtos ilimitados — você pode publicar toda a coleção de verão, calçados, bolsas e acessórios com foto, descrição e preço.',
      },
      {
        question: 'Como indico tamanhos P, M, G ou numeração de calçados para a cliente?',
        answer:
          'Você informa a grade disponível na descrição da peça (ex.: "Veste P ao G • Linho misto") e a cliente escreve o tamanho e a cor escolhidos no campo de observações ao fechar o carrinho.',
      },
      {
        question: 'O que acontece quando acaba o último tamanho de uma peça exclusiva?',
        answer:
          'Basta tocar em "Esgotado" no painel da vitrine. A peça recebe o aviso visual na hora, impedindo novos pedidos enquanto você aguarda reposição.',
      },
      {
        question: 'Consigo parcelar ou aceitar cartão de crédito na minha loja de roupas?',
        answer:
          'Sim. No Plano Pro (R$ 14,90/mês ou R$ 149,00/ano), você conecta sua conta do Mercado Pago e a cliente paga via Pix ou Cartão de Crédito com baixa automática no painel.',
      },
      {
        question: 'O catálogo funciona bem quando a cliente clica pelo Instagram no iPhone ou Android?',
        answer:
          'Sim. A VitriMini foi otimizada para abrir rápido dentro do navegador do Instagram e do WhatsApp, sem exigir download nem cadastro prévio da compradora.',
      },
    ],
  },
  {
    path: '/vitrine-digital-confeitaria',
    priority: '0.9',
    changefreq: 'weekly',
    title: 'Vitrine Digital para Confeitaria, Bolos e Encomendas com Sinal Pix | VitriMini',
    description:
      'Organize encomendas de bolos, doces, Páscoa e Natal. Calcule sinal de 50% no Pix automaticamente, bloqueie datas lotadas por turno e receba tudo no WhatsApp.',
    type: 'landing',
    badge: 'Para Confeitarias, Bolos Artesanais e Datas Comemorativas • 0% de taxa',
    h1: 'Vitrine Digital e Link de Pedidos para Confeitaria',
    lead: 'Pare de fazer conta de 50% de sinal na calculadora entre uma fornada e outra. Mostre Bolo Vulcão, Caixa de Brigadeiros ou Ovos de Colher com agenda por data e turno e cálculo automático do sinal no Pix.',
    highlights: [
      {
        title: 'Sinal de 50% no Pix sem fazer conta',
        description:
          'Defina a porcentagem de reserva na sua vitrine; o sistema calcula a entrada na hora para garantir o compromisso do cliente.',
      },
      {
        title: 'Datas sazonais sem overbooking',
        description:
          'Crie janelas específicas para Dia das Mães, Páscoa e Natal e encerre turnos lotados sem precisar responder um por um.',
      },
      {
        title: 'Resumo financeiro das encomendas',
        description:
          'Acompanhe no painel o total vendido, o que já entrou de sinal e o que falta receber na entrega ou retirada.',
      },
    ],
    faqItems: [
      {
        question: 'Como funciona o cálculo automático de sinal no Pix para bolos e doces?',
        answer:
          'Você escolhe a porcentagem de entrada (por exemplo, 30% ou 50%). Quando o cliente fecha um pedido de R$ 180, a vitrine exibe exatamente R$ 90 de sinal e libera sua chave Pix para ele copiar e pagar na hora.',
      },
      {
        question: 'Posso bloquear pedidos de última hora e aceitar só com antecedência ou datas fixas?',
        answer:
          'Sim. Você cadastra apenas os dias da semana ou datas comemorativas específicas (como 24/12 ou domingo de Páscoa) e os turnos disponíveis, impedindo encomendas fora da sua capacidade de forno.',
      },
      {
        question: 'Onde o cliente escreve a frase do topo do bolo ou detalhes da decoração?',
        answer:
          'Na tela de confirmação existe um campo dedicado para observações. O texto vai anexado ao pedido tanto no seu painel quanto na mensagem formatada do WhatsApp.',
      },
      {
        question: 'Posso receber o valor total no cartão de crédito para kits festa?',
        answer:
          'Sim. No Plano Pro (R$ 14,90/mês ou R$ 149,00/ano), você conecta seu Mercado Pago e aceita Cartão de Crédito ou Pix automático com 0% de comissão da VitriMini.',
      },
      {
        question: 'E se eu quiser parar de usar depois da campanha de Páscoa ou Natal?',
        answer:
          'Não existe multa nem fidelidade. Você pode optar pelo Pix Avulso apenas no mês que quiser divulgar ou cancelar a renovação pelo próprio painel a qualquer momento.',
      },
    ],
  },
  {
    path: '/link-pedidos-instagram',
    priority: '0.9',
    changefreq: 'weekly',
    title: 'VitriLink: Link na Bio com Vitrine Digital e Pedidos no WhatsApp | VitriMini',
    description:
      'Troque o link comum da bio por uma vitrine rápida com VitriLink, capa, botões com foto, QR Code para embalagens e carrinho direto no WhatsApp. 15 dias grátis.',
    type: 'landing',
    badge: 'VitriLink + Catálogo na Bio do Instagram e TikTok • 0% de comissão',
    h1: 'Vitrine Digital para Link da Bio no Instagram',
    lead: 'Quando o seguidor clica na sua bio e cai num WhatsApp vazio, metade desiste antes de você responder. Com o VitriLink e a vitrine VitriMini, ele vê fotos, preços e monta o pedido sozinho em segundos.',
    highlights: [
      {
        title: 'VitriLink com capa e cartões visuais',
        description:
          'No Plano Pro, destaque lançamentos, vitrine principal, WhatsApp e localização em uma página bonita com a sua identidade.',
      },
      {
        title: 'QR Code para gerar recompra na embalagem',
        description:
          'Baixe o cartão com QR Code no painel e cole nas sacolas e caixas para o cliente escanear e pedir de novo sem buscar seu @.',
      },
      {
        title: 'Venda no piloto automático de madrugada',
        description:
          'Mesmo fora do horário comercial, o seguidor navega, escolhe turno de entrega/retirada e deixa o pedido registrado.',
      },
    ],
    faqItems: [
      {
        question: 'Qual a diferença entre o VitriLink na bio e um agregador de links comum?',
        answer:
          'Agregadores comuns mostram apenas botões de texto. Na VitriMini, você tem cartões com foto no VitriLink (Plano Pro) integrados ao seu catálogo com carrinho, sinal no Pix, agendamento por turno e pagamento direto.',
      },
      {
        question: 'Posso usar meu próprio nome ou marca no link da bio?',
        answer:
          'Sim. Ao criar sua vitrine você escolhe um endereço curto e amigável (vitrimini.com.br/sualoja) para colocar direto na bio do Instagram, TikTok e perfil do WhatsApp Business.',
      },
      {
        question: 'Como funciona o QR Code para colocar nas sacolas e balcão?',
        answer:
          'Dentro do painel "Minhas Vitrines", você gera e baixa em 1 clique um cartão com o QR Code exclusivo da sua loja para imprimir e enviar junto com os pedidos.',
      },
      {
        question: 'Quem clica no link precisa criar conta ou senha para comprar?',
        answer:
          'Não. Seu seguidor escolhe os itens, informa nome, entrega ou retirada e envia o pedido em poucos segundos, sem cadastro burocrático.',
      },
      {
        question: 'O VitriLink já vem liberado nos 15 dias grátis?',
        answer:
          'Você testa sua primeira vitrine por 15 dias grátis sem cartão. Para manter o VitriLink com cartões com foto e o pagamento automático via Mercado Pago após o teste, basta escolher o Plano Pro (R$ 14,90/mês ou R$ 149,00/ano).',
      },
    ],
  },
  {
    path: '/termos',
    priority: '0.4',
    changefreq: 'monthly',
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
    priority: '0.4',
    changefreq: 'monthly',
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
    url: SITE_URL,
    logo: OG_IMAGE,
    sameAs: ['https://www.instagram.com/vitriminibr/'],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'suporte@vitrimini.com.br',
        url: 'https://wa.me/5575992197406',
        availableLanguage: ['Portuguese'],
      },
    ],
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

function buildSitemapXml() {
  const urlsXml = ROUTES.map(
    (route) => `  <url>
    <loc>${escapeHtml(`${SITE_URL}${route.path}`)}</loc>
    <lastmod>${SITEMAP_LASTMOD}</lastmod>
    <changefreq>${route.changefreq || 'weekly'}</changefreq>
    <priority>${route.priority || '0.8'}</priority>
  </url>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;
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
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${OG_IMAGE}" />`
  );

  html = html.replace(
    /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:secure_url" content="${OG_IMAGE}" />`
  );

  html = html.replace(
    /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:width" content="1200" />`
  );

  html = html.replace(
    /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:height" content="630" />`
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
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`
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

  const sitemapXml = buildSitemapXml();
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log('[prerender] Gerado: public/sitemap.xml e dist/sitemap.xml');
}

run();
