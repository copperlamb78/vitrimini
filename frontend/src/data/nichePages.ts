export type NicheKey =
  | 'cardapio-digital-whatsapp'
  | 'catalogo-online-roupas'
  | 'vitrine-digital-confeitaria'
  | 'link-pedidos-instagram';

export interface NicheFaqItem {
  question: string;
  answer: string;
}

export interface NichePageConfig {
  slug: NicheKey;
  path: `/${NicheKey}`;
  navLabel: string;
  seoTitle: string;
  seoDescription: string;
  badgeText: string;
  h1: string;
  heroSubtitle: string;
  beforeTitle: string;
  beforeItems: string[];
  afterTitle: string;
  afterItems: string[];
  ctaHeadline: string;
  ctaSubtitle: string;
  faqItems: NicheFaqItem[];
}

export const NICHE_PAGES: Record<NicheKey, NichePageConfig> = {
  'cardapio-digital-whatsapp': {
    slug: 'cardapio-digital-whatsapp',
    path: '/cardapio-digital-whatsapp',
    navLabel: 'Cardápio Digital para WhatsApp',
    seoTitle:
      'Cardápio Digital para WhatsApp sem Taxas por Pedido | VitriMini',
    seoDescription:
      'Crie seu cardápio digital para WhatsApp ideal para lanchonetes, marmitarias e delivery. Receba pedidos prontos com 0% de comissão e 15 dias grátis.',
    badgeText:
      'Ideal para Lanchonetes, Marmitarias e Delivery • 0% de comissão',
    h1: 'Cardápio Digital para WhatsApp sem Taxas por Pedido',
    heroSubtitle:
      'Organize os pedidos da sua lanchonete, marmitaria ou delivery sem pagar comissão para aplicativos. O cliente escolhe os itens no celular, informa entrega ou retirada e o pedido já chega somado no seu WhatsApp.',
    beforeTitle: 'Sem cardápio digital (atendimento lento no horário de pico)',
    beforeItems: [
      'Cliente pedindo cardápio em foto ou PDF que demora para carregar no celular.',
      'Erros de anotação no endereço, forma de pagamento ou itens da marmita e lanche.',
      'Taxas altas de aplicativos de delivery comendo até 27% do seu lucro.',
    ],
    afterTitle: 'Com seu Cardápio Digital VitriMini',
    afterItems: [
      'Link leve que abre em 1 segundo direto no WhatsApp ou Instagram da loja.',
      'Pedido chega formatado com itens, endereço de entrega, troco ou Pix e link de status em tempo real.',
      '0% de comissão sobre as vendas: 15 dias grátis para testar e depois apenas R$ 24,90 por 90 dias.',
    ],
    ctaHeadline:
      'Pronto para colocar o cardápio digital da sua lanchonete ou marmitaria no ar?',
    ctaSubtitle:
      'Comece agora com 15 dias grátis na sua primeira vitrine, sem cartão de crédito e com 0% de taxa sobre seus pedidos.',
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
        question: 'Como o cliente sabe se o pedido saiu para entrega?',
        answer:
          'Cada pedido gera um link exclusivo de acompanhamento em tempo real (/pedido/codigo). Quando você muda o status para "Em preparo" ou "Saiu para entrega" no painel, o cliente vê na hora pelo navegador.',
      },
      {
        question: 'Tem mensalidade ou fidelidade para usar o cardápio digital?',
        answer:
          'Não há mensalidade nem renovação automática. Você testa grátis por 15 dias na primeira vitrine e, quando quiser continuar, paga via Pix a partir de R$ 24,90 por 90 dias.',
      },
    ],
  },
  'catalogo-online-roupas': {
    slug: 'catalogo-online-roupas',
    path: '/catalogo-online-roupas',
    navLabel: 'Catálogo Online de Roupas',
    seoTitle:
      'Catálogo Online para Loja de Roupas e Moda com Pedidos no WhatsApp | VitriMini',
    seoDescription:
      'Monte seu catálogo online para loja de roupas, calçados e acessórios. Divulgue no Instagram e receba pedidos organizados no WhatsApp com 0% de comissão.',
    badgeText:
      'Para Lojas de Roupas, Calçados e Acessórios • 15 dias grátis',
    h1: 'Catálogo Online para Loja de Roupas e Moda',
    heroSubtitle:
      'Transforme suas seguidores em clientes com um catálogo online elegante e rápido. Exiba fotos das peças, preços e tamanhos na descrição, pause peças únicas vendidas em 1 toque e receba os pedidos prontos no WhatsApp.',
    beforeTitle: 'Sem catálogo online (Direct e WhatsApp congestionados)',
    beforeItems: [
      'Horas enviando dezenas de fotos soltas no WhatsApp para cada cliente que pede novidades.',
      'Clientes perguntando "quanto custa?" e "ainda tem disponível?" no Direct o dia todo.',
      'Duas clientes tentando comprar a mesma peça única porque não deu tempo de avisar que esgotou.',
    ],
    afterTitle: 'Com seu Catálogo de Moda na VitriMini',
    afterItems: [
      'Vitrine com a cor da sua marca para colocar na bio do Instagram e enviar nas listas de transmissão.',
      'Cliente escolhe as peças no carrinho, informa tamanho/cor nas observações e fecha no WhatsApp.',
      'Vendeu a última peça? Marque como esgotada em 1 segundo pelo celular.',
    ],
    ctaHeadline:
      'Pronta para criar o catálogo online da sua loja de roupas?',
    ctaSubtitle:
      'Teste grátis por 15 dias na sua primeira vitrine, divulgue na bio do Instagram e venda mais pelo WhatsApp sem pagar comissão.',
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
        question: 'O link do catálogo funciona bem na bio do Instagram?',
        answer:
          'Sim. A vitrine foi desenhada para abrir instantaneamente no navegador interno do Instagram e do WhatsApp, sem exigir que a cliente baixe aplicativo.',
      },
      {
        question: 'Preciso cadastrar cartão de crédito para testar os 15 dias grátis?',
        answer:
          'Não. Você cria e publica sua primeira vitrine com 15 dias grátis sem informar cartão. Só paga via Pix se quiser manter a vitrine ativa após o período de teste.',
      },
    ],
  },
  'vitrine-digital-confeitaria': {
    slug: 'vitrine-digital-confeitaria',
    path: '/vitrine-digital-confeitaria',
    navLabel: 'Vitrine Digital para Confeitaria',
    seoTitle:
      'Vitrine Digital e Link de Pedidos para Confeitaria e Encomendas | VitriMini',
    seoDescription:
      'Crie sua vitrine digital para confeitaria, bolos, doces e datas comemorativas. Calcule sinal de 50% no Pix automaticamente e organize encomendas no WhatsApp.',
    badgeText:
      'Feito para Confeitarias, Bolos, Doces e Datas Comemorativas',
    h1: 'Vitrine Digital e Link de Pedidos para Confeitaria',
    heroSubtitle:
      'Pare de perder tempo calculando sinal e conferindo agenda entre uma fornada e outra. Configure suas datas e turnos disponíveis, exiba o valor do sinal via Pix automaticamente e receba encomendas prontas no WhatsApp.',
    beforeTitle: 'Encomendas anotadas no caderno e PDF pesado',
    beforeItems: [
      'Cardápio em PDF pesado que o cliente não consegue abrir ou precisa ficar dando zoom.',
      'Cálculo manual de 50% de sinal no Pix para cada orçamento enviado no WhatsApp.',
      'Confusão de datas e horários de retirada em épocas de pico como Páscoa, Dia das Mães e Natal.',
    ],
    afterTitle: 'Com sua Vitrine de Encomendas VitriMini',
    afterItems: [
      'Agenda inteligente: o cliente só escolhe entre as datas e turnos (manhã/tarde) que você liberar.',
      'Cálculo automático do sinal (ex.: 50%) com botão para o cliente copiar sua chave Pix na hora.',
      'Painel de pedidos e resumo financeiro para você produzir com tranquilidade e 0% de comissão.',
    ],
    ctaHeadline:
      'Organize suas encomendas de bolos e doces hoje mesmo',
    ctaSubtitle:
      'Experimente por 15 dias grátis na sua primeira vitrine e veja como é simples receber encomendas com sinal calculado no WhatsApp.',
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
      {
        question: 'Quanto custa depois dos 15 dias grátis?',
        answer:
          'Para continuar após os 15 dias grátis, você escolhe entre o Plano Essencial (R$ 24,90 por 90 dias via Pix) ou o Plano Pro com Mercado Pago integrado (R$ 39,90 por 90 dias ou R$ 99,90 por 365 dias).',
      },
    ],
  },
  'link-pedidos-instagram': {
    slug: 'link-pedidos-instagram',
    path: '/link-pedidos-instagram',
    navLabel: 'Vitrine para Bio do Instagram',
    seoTitle:
      'Vitrine Digital para Link da Bio no Instagram e Pedidos no WhatsApp | VitriMini',
    seoDescription:
      'Coloque uma vitrine digital no link da bio do Instagram e transforme seguidores em pedidos organizados no WhatsApp. 15 dias grátis e 0% de comissão.',
    badgeText:
      'Do Link da Bio direto para o seu WhatsApp • Sem comissão',
    h1: 'Vitrine Digital para Link da Bio no Instagram',
    heroSubtitle:
      'Substitua listas de links confusas por uma vitrine digital rápida que vende por você 24 horas por dia. Seu seguidor clica no link da bio, monta o carrinho em segundos e envia o pedido pronto para o seu WhatsApp.',
    beforeTitle: 'Link da bio comum (apenas joga para o WhatsApp vazio)',
    beforeItems: [
      'O seguidor clica no link da bio, cai no WhatsApp em branco e pergunta "o que vocês têm hoje?".',
      'Demora no atendimento faz o cliente desistir da compra antes de você responder.',
      'Destaques dos Stories desatualizados com preços antigos que geram atrito na venda.',
    ],
    afterTitle: 'Com a VitriMini no Link da Bio do Instagram',
    afterItems: [
      'Catálogo sempre atualizado com fotos, preços e carrinho de compras direto no navegador.',
      'O cliente já chega no seu WhatsApp com o pedido decidido, somado e pronto para pagar.',
      'Gera QR Code exclusivo da sua vitrine para imprimir em embalagens, sacolas e balcão.',
    ],
    ctaHeadline:
      'Transforme o link da sua bio em uma máquina de pedidos',
    ctaSubtitle:
      'Crie sua vitrine digital em 2 minutos, coloque na bio do Instagram e aproveite 15 dias grátis para vender sem taxas.',
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
        question: 'A vitrine também gera QR Code para colocar nas minhas embalagens?',
        answer:
          'Sim. No painel "Minhas Vitrines" você baixa o cartão com QR Code pronto da sua loja para imprimir em sacolas, caixas, cartões de visita ou exibir no balcão.',
      },
      {
        question: 'Meus seguidores precisam instalar algum aplicativo para comprar?',
        answer:
          'Não. A vitrine abre direto no navegador do celular em 1 clique, tanto pelo Instagram quanto pelo WhatsApp.',
      },
      {
        question: 'Como funciona o pagamento da plataforma?',
        answer:
          'Você tem 15 dias grátis na primeira vitrine para testar à vontade. Depois, se quiser continuar, faz um pagamento pré-pago via Pix a partir de R$ 24,90 por 90 dias, sem mensalidade e sem renovação automática.',
      },
    ],
  },
};

export const NICHE_LINKS_LIST: NichePageConfig[] = [
  NICHE_PAGES['cardapio-digital-whatsapp'],
  NICHE_PAGES['catalogo-online-roupas'],
  NICHE_PAGES['vitrine-digital-confeitaria'],
  NICHE_PAGES['link-pedidos-instagram'],
];
