export type NicheKey =
  | 'cardapio-digital-whatsapp'
  | 'catalogo-online-roupas'
  | 'vitrine-digital-confeitaria'
  | 'link-pedidos-instagram';

export interface NicheFaqItem {
  question: string;
  answer: string;
}

export interface NicheHighlightItem {
  title: string;
  description: string;
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
  highlights?: NicheHighlightItem[];
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
      'Cardápio Digital para WhatsApp sem Taxa de Delivery | VitriMini',
    seoDescription:
      'Substitua o PDF pesado na sua marmitaria, hamburgueria ou lanchonete. Cardápio digital para WhatsApp com turnos de almoço/jantar, pausa em 1 clique e 0% de comissão.',
    badgeText:
      'Para Marmitarias, Hamburguerias e Delivery • 0% de comissão por pedido',
    h1: 'Cardápio Digital para WhatsApp sem Taxas por Pedido',
    heroSubtitle:
      'Pare de perder até 27% do faturamento em aplicativos de entrega. Na sua marmitaria ou lanchonete, o cliente escolhe Marmita Executiva ou Combo Smash Burger no celular, seleciona entrega ou retirada e envia o pedido somado no seu WhatsApp.',
    beforeTitle: 'Atendimento travado no horário do almoço e jantar',
    beforeItems: [
      'Enviar PDF de 12 MB que não abre no 4G quando o cliente está com pressa para almoçar.',
      'Anotar errado o ponto da carne, a troca de acompanhamento ou o troco para R$ 50 no meio do pico.',
      'Pagar mensalidade cara e comissão alta por cada marmita ou lanche vendido fora do balcão.',
    ],
    afterTitle: 'Operação enxuta com Cardápio Digital VitriMini',
    afterItems: [
      'Abertura instantânea no WhatsApp com fotos leves e categorias (Marmitas, Lanches, Bebidas).',
      'Agendamento separado por turno — Almoço (11h–14h) e Jantar (18h–23h) — com entrega ou retirada.',
      'Botão de "Esgotado" em 1 toque para pausar a feijoada ou o combo que acabou sem apagar o prato.',
    ],
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
    ctaHeadline:
      'Coloque o cardápio da sua cozinha no WhatsApp sem pagar comissão',
    ctaSubtitle:
      'Publique hoje com 15 dias grátis sem cartão, 0% de taxa sobre os pedidos e planos a partir de R$ 9,90/mês.',
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

  'catalogo-online-roupas': {
    slug: 'catalogo-online-roupas',
    path: '/catalogo-online-roupas',
    navLabel: 'Catálogo Online de Roupas',
    seoTitle:
      'Catálogo Online para Loja de Roupas, Calçados e Acessórios | VitriMini',
    seoDescription:
      'Mostre looks, numerações e coleções sem mandar 30 fotos no WhatsApp. Catálogo online de moda com baixa automática no Mercado Pago e 0% de comissão.',
    badgeText:
      'Para Lojas de Moda Feminina, Calçados e Semijoias • 15 dias grátis',
    h1: 'Catálogo Online para Loja de Roupas e Moda',
    heroSubtitle:
      'Chega de passar a tarde enviando dezenas de fotos soltas no WhatsApp. Exiba Vestido Midi Linho, Tênis Casual ou Kits de Semijoias com preço visível, pause peças únicas em 1 toque e receba no Pix ou Cartão direto na sua conta.',
    beforeTitle: 'Vendas travadas no Direct e em álbuns soltos',
    beforeItems: [
      'Responder "qual o valor?" e "tem tamanho M?" dezenas de vezes nos comentários e no Direct.',
      'Duas clientes pagarem pela mesma peça única de coleção porque não deu tempo de apagar o Story.',
      'Perder vendas por falta de link rápido com pagamento em cartão de crédito no celular.',
    ],
    afterTitle: 'Sua vitrine de moda organizada e pronta para fechar',
    afterItems: [
      'Link elegante com a paleta da sua marca para fixar na bio do Instagram e enviar nas listas VIP.',
      'Descrição clara com grade (P/M/G ou 34 ao 39), tecido e campo de observação para cor e tamanho.',
      'Integração com Mercado Pago no Plano Pro para receber Pix e Cartão com confirmação automática.',
    ],
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
    ctaHeadline:
      'Transforme suas seguidoras em compradoras com um catálogo profissional',
    ctaSubtitle:
      'Crie seu catálogo de moda em minutos com 15 dias grátis sem cartão e zero comissão sobre cada peça vendida.',
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

  'vitrine-digital-confeitaria': {
    slug: 'vitrine-digital-confeitaria',
    path: '/vitrine-digital-confeitaria',
    navLabel: 'Vitrine Digital para Confeitaria',
    seoTitle:
      'Vitrine Digital para Confeitaria, Bolos e Encomendas com Sinal Pix | VitriMini',
    seoDescription:
      'Organize encomendas de bolos, doces, Páscoa e Natal. Calcule sinal de 50% no Pix automaticamente, bloqueie datas lotadas por turno e receba tudo no WhatsApp.',
    badgeText:
      'Para Confeitarias, Bolos Artesanais e Datas Comemorativas • 0% de taxa',
    h1: 'Vitrine Digital e Link de Pedidos para Confeitaria',
    heroSubtitle:
      'Pare de fazer conta de 50% de sinal na calculadora entre uma fornada e outra. Mostre Bolo Vulcão, Caixa de Brigadeiros ou Ovos de Colher com agenda por data e turno e cálculo automático do sinal no Pix.',
    beforeTitle: 'Encomendas espalhadas em caderno, áudios e PDF',
    beforeItems: [
      'Gastar horas no WhatsApp explicando sabores, pesos e calculando metade do valor para cada orçamento.',
      'Cliente pedindo bolo decorado para o mesmo dia ou em horário que você já fechou a produção.',
      'Anotar frase de topo de bolo ou alergia alimentar em papel solto e correr risco na Páscoa ou Natal.',
    ],
    afterTitle: 'Produção tranquila com agenda e sinal automático',
    afterItems: [
      'Calendário inteligente: a pessoa só escolhe datas e turnos (Manhã 9h–12h ou Tarde 14h–18h) liberados por você.',
      'Cálculo automático do sinal no Pix (ex.: 50%) com botão "Copiar chave Pix" já na finalização.',
      'Campo de observações para frase no topo, sabor do recheio e recado de presente direto no painel.',
    ],
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
    ctaHeadline:
      'Organize sua confeitaria e pare de perder encomendas por demora no orçamento',
    ctaSubtitle:
      'Teste grátis por 15 dias sem cartão, configure seu sinal no Pix em 2 minutos e pague 0% de comissão sobre seus doces.',
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

  'link-pedidos-instagram': {
    slug: 'link-pedidos-instagram',
    path: '/link-pedidos-instagram',
    navLabel: 'Vitrine para Bio do Instagram',
    seoTitle:
      'VitriLink: Link na Bio com Vitrine Digital e Pedidos no WhatsApp | VitriMini',
    seoDescription:
      'Troque o link comum da bio por uma vitrine rápida com VitriLink, capa, botões com foto, QR Code para embalagens e carrinho direto no WhatsApp. 15 dias grátis.',
    badgeText:
      'VitriLink + Catálogo na Bio do Instagram e TikTok • 0% de comissão',
    h1: 'Vitrine Digital para Link da Bio no Instagram',
    heroSubtitle:
      'Quando o seguidor clica na sua bio e cai num WhatsApp vazio, metade desiste antes de você responder. Com o VitriLink e a vitrine VitriMini, ele vê fotos, preços e monta o pedido sozinho em segundos.',
    beforeTitle: 'Link da bio genérico que desperdiça cliques dos Reels',
    beforeItems: [
      'Seguidor entra no WhatsApp perguntando "oi, quanto tá aquele kit do último vídeo?" e esfria esperando resposta.',
      'Árvore de links sem foto que manda a pessoa para vários lugares e não fecha nenhuma venda.',
      'Destaques dos Stories com preços desatualizados gerando atrito e desistência no atendimento.',
    ],
    afterTitle: 'Bio vendedora 24h com VitriLink + Carrinho',
    afterItems: [
      'Página de bio com sua capa, cartões visuais com foto e acesso direto ao catálogo de produtos.',
      'Seguidor adiciona Kit Skincare ou Vela Aromática no carrinho e já chega no WhatsApp pronto para pagar.',
      'Cartão com QR Code da sua vitrine pronto para imprimir em sacolas, caixas e cartões de agradecimento.',
    ],
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
    ctaHeadline:
      'Faça cada clique na bio do Instagram virar pedido pronto no WhatsApp',
    ctaSubtitle:
      'Configure sua vitrine em 2 minutos, teste grátis por 15 dias sem cartão e receba 100% do valor das suas vendas.',
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
};

export const NICHE_LINKS_LIST: NichePageConfig[] = [
  NICHE_PAGES['cardapio-digital-whatsapp'],
  NICHE_PAGES['catalogo-online-roupas'],
  NICHE_PAGES['vitrine-digital-confeitaria'],
  NICHE_PAGES['link-pedidos-instagram'],
];
