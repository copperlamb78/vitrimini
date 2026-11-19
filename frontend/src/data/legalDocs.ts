export interface LegalSection {
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: Array<{
    boldPrefix?: string;
    text: string;
  }>;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<'terms' | 'privacy', LegalDocument> = {
  terms: {
    title: 'Termos de Uso — VitriMini',
    subtitle: 'Condições gerais de contratação e uso da plataforma por lojistas',
    updatedAt: 'Novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Identificação e Aceite',
        paragraphs: [
          'O VitriMini é uma plataforma digital operada por Antonio Gabriel Gomes Falcão do Nascimento (marca NeoDevZone), doravante denominado "Plataforma". Ao criar uma conta, montar ou publicar uma vitrine, o usuário ("Lojista") declara ter lido e concordado integralmente com estes Termos.',
        ],
      },
      {
        number: '2',
        title: 'Objeto do Serviço',
        paragraphs: [
          'O VitriMini oferece uma ferramenta de criação de vitrines digitais de encomendas com geração de resumo de pedido para envio direto ao WhatsApp do Lojista. A Plataforma não é um marketplace, não realiza intermediação financeira das vendas do Lojista e não cobra comissão sobre os pedidos recebidos.',
        ],
      },
      {
        number: '3',
        title: 'Cadastro e Segurança da Conta',
        paragraphs: [
          'O Lojista é integralmente responsável pela veracidade dos dados cadastrados (nome, e-mail e telefone/WhatsApp) e pela guarda de sua senha de acesso.',
        ],
      },
      {
        number: '4',
        title: 'Pagamento, Vigência (90 dias) e Exclusão após Carência (30 dias)',
        bullets: [
          {
            text: 'A publicação da vitrine ocorre mediante pagamento único de R$ 24,90 via Pix, garantindo sua disponibilidade pública pelo prazo de 90 (noventa) dias corridos a contar da confirmação do pagamento, sem cobrança ou renovação automática.',
          },
          {
            text: 'Após o término dos 90 dias, a vitrine entra em estado expirado (ficando indisponível para novos pedidos) por um período de carência de 30 (trinta) dias corridos, durante o qual o Lojista poderá renová-la por mais 90 dias.',
          },
          {
            boldPrefix: 'Exclusão definitiva:',
            text: 'Caso não seja renovada dentro do prazo de carência de 30 dias, a vitrine, seus produtos e todas as imagens enviadas serão permanentemente apagados do banco de dados e dos servidores, de forma irreversível.',
          },
        ],
      },
      {
        number: '5',
        title: 'Direito de Arrependimento e Reembolso',
        paragraphs: [
          'Em conformidade com o art. 49 do Código de Defesa do Consumidor, o Lojista poderá solicitar o cancelamento e reembolso integral no prazo de até 7 (sete) dias corridos após a confirmação do pagamento. A solicitação deve ser feita exclusivamente por e-mail para nascimentogabriel.2004@gmail.com, com prazo de resposta da equipe de suporte de até 3 (três) dias úteis. Confirmado o estorno, a vitrine será imediatamente desativada.',
        ],
      },
      {
        number: '6',
        title: 'Responsabilidade sobre Vendas, Entregas e Conteúdo',
        bullets: [
          {
            text: 'Toda negociação, recebimento via Pix do Lojista, produção, qualidade e entrega das encomendas ocorrem exclusivamente entre o Lojista e seu cliente final. O VitriMini não garante entregas nem se responsabiliza por prejuízos, atrasos ou fraudes praticadas por terceiros.',
          },
          {
            text: 'É estritamente proibido publicar produtos ilícitos, falsificados, restritos por lei ou conteúdo ofensivo. O VitriMini reserva-se o direito de suspender ou remover imediatamente, sem direito a reembolso, qualquer vitrine que viole esta cláusula.',
          },
        ],
      },
      {
        number: '7',
        title: 'Foro e Contato',
        paragraphs: [
          'Para dirimir quaisquer controvérsias oriundas destes Termos, fica eleito o foro da Comarca de Feira de Santana – BA. Canal oficial de suporte: nascimentogabriel.2004@gmail.com.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade (LGPD) — VitriMini',
    subtitle: 'Transparência sobre o tratamento e proteção de dados pessoais',
    updatedAt: 'Novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Controlador dos Dados',
        paragraphs: [
          'Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD), o controlador dos dados pessoais tratados nesta plataforma é Antonio Gabriel Gomes Falcão do Nascimento (NeoDevZone), contato: nascimentogabriel.2004@gmail.com.',
        ],
      },
      {
        number: '2',
        title: 'Dados Coletados e Finalidade',
        bullets: [
          {
            boldPrefix: 'Dados do Lojista:',
            text: 'Nome, e-mail, número de telefone/WhatsApp, senha (armazenada exclusivamente sob criptografia irreversível/hash), chave Pix informada para exibição na vitrine, textos e fotos dos produtos. Finalidade: autenticação, operação da vitrine, suporte e registros fiscais/históricos de contratação.',
          },
          {
            boldPrefix: 'Dados dos Clientes Finais (Compradores):',
            text: 'O VitriMini não exige cadastro nem armazena dados pessoais ou pedidos dos compradores em seu banco de dados. Os itens escolhidos são formatados no navegador do comprador e enviados diretamente para o WhatsApp do Lojista.',
          },
          {
            boldPrefix: 'Dados de Pagamento:',
            text: 'O processamento do Pix de ativação/renovação é realizado pelo gateway Mercado Pago. O VitriMini armazena apenas o identificador da transação, data, valor e status de aprovação.',
          },
        ],
      },
      {
        number: '3',
        title: 'Compartilhamento de Dados',
        paragraphs: [
          'Os dados do Lojista não são vendidos ou cedidos para fins publicitários. São compartilhados estritamente com provedores essenciais à operação (infraestrutura de hospedagem e Mercado Pago para processamento do Pix), além das informações públicas da própria vitrine (nome da loja, WhatsApp e chave Pix) exibidas aos clientes pelo Lojista.',
        ],
      },
      {
        number: '4',
        title: 'Armazenamento, Segurança e Eliminação',
        paragraphs: [
          'Adotamos criptografia de senhas, validação estrita de entradas e controle de acesso autenticado. Conforme os Termos de Uso, vitrines vencidas há mais de 30 (trinta) dias sem renovação têm seus registros e imagens definitivamente excluídos dos servidores.',
        ],
      },
      {
        number: '5',
        title: 'Direitos do Titular e Contato (DPO)',
        paragraphs: [
          'O Lojista pode solicitar a confirmação, correção, portabilidade ou exclusão de sua conta e dados pessoais a qualquer momento pelo e-mail nascimentogabriel.2004@gmail.com.',
        ],
      },
    ],
  },
};
