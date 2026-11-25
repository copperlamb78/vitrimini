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
    subtitle:
      'Condições gerais de contratação, assinaturas e uso da plataforma SaaS (Versão 2.0)',
    updatedAt: '24 de novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Objeto, Escopo e Aceite',
        paragraphs: [
          'A VitriMini é uma plataforma de software como serviço (SaaS) operada por Antonio Gabriel Gomes Falcão do Nascimento (marca NeoDevZone), doravante denominada "VitriMini" ou "Plataforma". Ao criar uma conta, utilizar o período de avaliação gratuita, publicar uma vitrine ou realizar um pedido, o usuário ("Lojista" ou "Comprador", conforme aplicável) declara ter lido, compreendido e aceitado integralmente estes Termos de Uso, regidos pelo Código Civil (Lei nº 10.406/2002), pelo Código de Defesa do Consumidor (Lei nº 8.078/1990 – CDC) e pelo Marco Civil da Internet (Lei nº 12.965/2014).',
          'O escopo da VitriMini compreende exclusivamente o fornecimento de infraestrutura tecnológica para criação de vitrines digitais, gestão de pedidos, resumo financeiro, hub de links (VitriLink) e integração de checkout com intermediadores de pagamento (Mercado Pago).',
        ],
      },
      {
        number: '2',
        title: 'Cadastro e Conta do Lojista',
        paragraphs: [
          'O acesso às funcionalidades de gestão exige o cadastro prévio do Lojista, que assume integral responsabilidade pela exatidão, veracidade e atualização dos dados fornecidos, incluindo nome, endereço de e-mail, número de WhatsApp, chave Pix, slug da loja e credenciais OAuth de integração.',
          'O Lojista é o único responsável pela guarda, sigilo e uso adequado de sua senha e credenciais de acesso, comprometendo-se a não compartilhá-las com terceiros não autorizados e a comunicar imediatamente à Plataforma qualquer suspeita de acesso indevido pelo e-mail suporte@vitrimini.com.br.',
        ],
      },
      {
        number: '3',
        title: 'Planos, Período de Teste, Pagamentos e Renovação',
        paragraphs: [
          'A contratação da VitriMini ocorre por meio de planos digitais exibidos na interface da Plataforma no momento da adesão, prevalecendo os valores, periodicidades e condições vigentes no ato da contratação:',
        ],
        bullets: [
          {
            boldPrefix: 'Avaliação Gratuita de 15 Dias:',
            text: 'Na criação da primeira vitrine, quando ofertado na contratação, o Lojista dispõe de um período único de avaliação gratuita de 15 (quinze) dias corridos para testar os recursos da Plataforma, com transição para os planos pagos (Essencial ou Plano Pro, em ciclo trimestral ou anual) mediante contratação expressa.',
          },
          {
            boldPrefix: 'Planos Pagos (Essencial e Plano Pro):',
            text: 'O plano Essencial libera a vitrine pública, catálogo de produtos, carrinho com envio organizado para WhatsApp, cálculo de sinal via Pix manual do Lojista, resumo financeiro, VitriLink e painel de gestão. O Plano Pro (trimestral ou anual) inclui todos os recursos do Essencial acrescidos da integração direta com a conta Mercado Pago do Lojista para recebimento online via Pix e Cartão de Crédito com atualização automática de status no painel.',
          },
          {
            boldPrefix: 'Modalidades de Cobrança:',
            text: 'Os pagamentos dos planos da Plataforma ocorrem via Pix ou Cartão de Crédito — incluindo cobrança recorrente (assinatura automática) quando selecionada essa modalidade pelo usuário — e são processados diretamente por intermediador financeiro parceiro (Mercado Pago).',
          },
          {
            boldPrefix: 'Soma de Prazo, Upgrade e Expiração:',
            text: 'Na renovação antecipada ou no upgrade de plano antes do vencimento, os novos dias contratados somam-se integralmente ao saldo de vigência restante, com liberação imediata dos recursos do plano superior. Encerrado o ciclo sem renovação, a vitrine entra em status expirado por período de carência de 30 (trinta) dias corridos, permanecendo acessível apenas no painel para reativação; após esse prazo sem renovação, o catálogo, produtos, pedidos vinculados e imagens são excluídos de forma permanente.',
          },
        ],
      },
      {
        number: '4',
        title: 'Cancelamento e Direito de Arrependimento',
        bullets: [
          {
            boldPrefix: 'Cancelamento da Renovação Automática:',
            text: 'O Lojista tem o direito de cancelar a renovação automática de sua assinatura a qualquer momento diretamente pelo painel de controle antes da data da próxima cobrança, mantendo o acesso integral aos recursos contratados até o término do ciclo já pago.',
          },
          {
            boldPrefix: 'Direito de Arrependimento (Art. 49 do CDC):',
            text: 'Em conformidade com o art. 49 do Código de Defesa do Consumidor, o Lojista exerce o direito de arrependimento e obtém o reembolso integral do valor pago em até 7 (sete) dias corridos contados da primeira contratação paga, mediante solicitação enviada pelo e-mail titular da conta para suporte@vitrimini.com.br, desde que não haja fraude ou violação destes Termos. Efetuado o estorno, a vitrine correspondente é imediatamente desativada.',
          },
        ],
      },
      {
        number: '5',
        title: 'Isenção de Comissão e Relação Lojista-Comprador',
        paragraphs: [
          'A VitriMini fornece exclusivamente infraestrutura de software e cobra 0% (zero por cento) de comissão sobre as vendas realizadas nas vitrines. Toda relação comercial de compra e venda ocorre única e exclusivamente entre o Lojista titular da vitrine e o Comprador final.',
        ],
        bullets: [
          {
            boldPrefix: 'Recebimento Direto ao Lojista:',
            text: 'Os valores pagos pelos compradores diretamente na chave Pix do Lojista ou na conta Mercado Pago conectada via OAuth pertencem e transitam exclusivamente para a titularidade do Lojista, sem retenção ou intermediação financeira pela VitriMini.',
          },
          {
            boldPrefix: 'Responsabilidade Exclusiva do Lojista:',
            text: 'A VitriMini não participa da fabricação, estoque, qualidade, segurança, higiene, prazos de preparo, entrega, emissão de notas fiscais, tributação, atendimento pós-venda, contestações (chargebacks) ou estornos dos produtos anunciados. O Lojista responde integralmente perante os consumidores finais e órgãos competentes pelo cumprimento do CDC e demais normas aplicáveis.',
          },
        ],
      },
      {
        number: '6',
        title: 'Uso Aceitável e Propriedade Intelectual',
        paragraphs: [
          'É estritamente proibido utilizar a VitriMini para anunciar, comercializar ou praticar atos relacionados a produtos ilícitos, falsificados, contrabandeados, entorpecentes, armas, golpes financeiros, fraudes, phishing, conteúdo discriminatório ou ilegal, bem como realizar tentativas de enumeração de dados, invasão, engenharia reversa, sobrecarga automatizada ou uso abusivo de uploads de mídia.',
          'A marca VitriMini, seu código-fonte, layout, design system e demais ativos de software pertencem exclusivamente à operadora da Plataforma. O Lojista mantém a titularidade integral sobre suas marcas, fotos, descrições e links inseridos na vitrine e no VitriLink, concedendo à VitriMini licença não exclusiva e limitada à hospedagem, exibição e processamento técnico necessários à operação do serviço.',
          'A constatação de fraude ou violação desta cláusula autoriza a suspensão ou exclusão imediata da conta e da vitrine, sem reembolso e com preservação de registros técnicos para cooperação com autoridades competentes.',
        ],
      },
      {
        number: '7',
        title: 'Disponibilidade, Suporte e Foro',
        paragraphs: [
          'A VitriMini opera em infraestrutura em nuvem com aplicação de boas práticas técnicas de segurança, estabilidade e disponibilidade ("como está" e "conforme disponível"), sujeita a janelas de manutenção técnica. Nos limites legais, a VitriMini não responde por lucros cessantes, danos indiretos ou indisponibilidades causadas por falhas em serviços de terceiros, tais como Mercado Pago, WhatsApp (Meta), operadoras de telecomunicações, sistema Pix ou provedores globais de nuvem.',
          'O atendimento oficial de suporte funciona pelo e-mail suporte@vitrimini.com.br. Para dirimir controvérsias oriundas destes Termos, aplica-se a legislação brasileira, ficando eleito o foro da Comarca de Feira de Santana – BA (sede da contratada), ressalvado o foro do domicílio do consumidor quando aplicável nos termos do Código de Defesa do Consumidor.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade (LGPD) — VitriMini',
    subtitle:
      'Transparência sobre o tratamento, segurança e proteção de dados pessoais (Versão 2.0)',
    updatedAt: '24 de novembro de 2026',
    sections: [
      {
        number: '1',
        title: 'Papéis de Controlador e Operador (LGPD)',
        paragraphs: [
          'Esta Política de Privacidade descreve como os dados pessoais são tratados na plataforma VitriMini em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD), distinguindo os papéis de cada agente:',
        ],
        bullets: [
          {
            boldPrefix: 'VitriMini como Controladora:',
            text: 'A VitriMini (operada por Antonio Gabriel Gomes Falcão do Nascimento – NeoDevZone) atua como Controladora dos dados pessoais relativos ao cadastro, autenticação, assinatura, uso do VitriLink e logs técnicos de segurança das contas de Lojistas e usuários autenticados na Plataforma.',
          },
          {
            boldPrefix: 'Lojista como Controlador e VitriMini como Operadora:',
            text: 'Em relação aos dados pessoais de Compradores Finais inseridos nos pedidos realizados nas vitrines, cada Lojista titular atua como Controlador autônomo e independente, definindo as finalidades de atendimento, preparo e entrega. Nessa operação, a VitriMini atua exclusivamente como Operadora de tecnologia, provendo a infraestrutura para registro e visualização do pedido.',
          },
        ],
      },
      {
        number: '2',
        title: 'Dados Coletados e Finalidades',
        bullets: [
          {
            boldPrefix: 'Dados Cadastrais e da Loja:',
            text: 'Nome, e-mail, telefone/WhatsApp, senha (armazenada exclusivamente em hash criptográfico bcrypt), slug da vitrine, chave Pix, endereço/turnos de atendimento, links configurados no VitriLink e imagens enviadas ao armazenamento em nuvem. Finalidade: autenticação segura, operação da vitrine, gestão de pedidos, resumo financeiro e suporte.',
          },
          {
            boldPrefix: 'Dados de Pedidos nas Vitrines:',
            text: 'Nome do comprador, telefone/WhatsApp, modalidade de recebimento, endereço de entrega (quando aplicável), data/turno, itens do pedido, forma de pagamento e observações. Finalidade: viabilizar o processamento do pedido pelo Lojista e disponibilizar o acompanhamento do pedido (com ocultação pública de telefone e endereço para proteção da privacidade).',
          },
          {
            boldPrefix: 'Registros de Acesso e Segurança:',
            text: 'Endereço IP, registros de data e hora (timestamps) de aceite destes documentos, versão aceita, tokens de sessão (Refresh Tokens em hash SHA-256 via cookie HttpOnly) e logs técnicos de requisições. Finalidade: prevenção a fraudes, proteção contra varreduras automatizadas e enumeração (rate limiting), segurança da conta e cumprimento das obrigações de guarda de registros previstas no Marco Civil da Internet (Lei nº 12.965/2014).',
          },
        ],
      },
      {
        number: '3',
        title: 'Dados Financeiros e Pagamentos (PCI-DSS)',
        paragraphs: [
          'A VitriMini não coleta e não armazena números completos de cartão de crédito, códigos de segurança (CVV) ou senhas bancárias em seus servidores.',
          'Toda captura, tokenização e processamento de pagamentos via Cartão de Crédito ou Pix (tanto nas assinaturas da Plataforma quanto no checkout das vitrines conectadas no Plano Pro) ocorre diretamente no ambiente criptografado do gateway parceiro (Mercado Pago), em conformidade com os padrões de segurança PCI-DSS. A VitriMini armazena apenas metadados técnicos da transação (identificador, status, valor e data) e mantém os tokens OAuth de integração do Lojista criptografados em repouso por meio do algoritmo AES-256-GCM.',
        ],
      },
      {
        number: '4',
        title: 'Compartilhamento com Terceiros (Suboperadores) e Cookies',
        paragraphs: [
          'A VitriMini não vende, aluga ou comercializa dados pessoais, tampouco utiliza cookies de rastreamento publicitário de terceiros (empregando apenas cookies e armazenamento local estritamente necessários à sessão autenticada e ao funcionamento do carrinho). O compartilhamento ocorre exclusivamente na medida necessária com suboperadores essenciais à operação do serviço:',
        ],
        bullets: [
          {
            boldPrefix: 'Hospedagem e Banco de Dados em Nuvem:',
            text: 'Provedores de servidores de aplicação e banco de dados relacional gerenciado (Render e Supabase/PostgreSQL) para execução e persistência segura da Plataforma.',
          },
          {
            boldPrefix: 'Armazenamento de Mídia e CDN:',
            text: 'Serviço de armazenamento em nuvem e entrega de conteúdo (Cloudflare / Cloudflare R2) para hospedagem de logos e fotos de produtos e proteção de borda.',
          },
          {
            boldPrefix: 'E-mails Transacionais:',
            text: 'Provedor de mensageria transacional (Brevo) para envio de confirmações de conta, recuperação de senha e notificações operacionais.',
          },
          {
            boldPrefix: 'Processador de Pagamentos:',
            text: 'Mercado Pago, para processamento financeiro das assinaturas da Plataforma (Pix e Cartão de Crédito, incluindo recorrência) e dos pagamentos online nas vitrines conectadas.',
          },
        ],
      },
      {
        number: '5',
        title: 'Bases Legais, Retenção e Segurança',
        paragraphs: [
          'O tratamento de dados pessoais na VitriMini fundamenta-se nas bases legais de execução de contrato (art. 7º, V, da LGPD), cumprimento de obrigação legal ou regulatória (art. 7º, II, da LGPD — incluindo Marco Civil da Internet e normas fiscais) e legítimo interesse para segurança da informação e prevenção a fraudes (art. 7º, IX, da LGPD).',
          'Os dados permanecem armazenados enquanto a conta ou vitrine estiver ativa e durante o período de carência de 30 (trinta) dias após o vencimento sem renovação. Encerrada a conta ou decorrida a carência, os dados da vitrine, produtos, pedidos vinculados e imagens são eliminados de forma definitiva, ressalvada a retenção mínima exigida por lei ou para exercício regular de direitos (art. 16 da LGPD).',
        ],
      },
      {
        number: '6',
        title: 'Direitos do Titular (Art. 18 da LGPD) e Canal de Contato',
        paragraphs: [
          'Nos termos do art. 18 da LGPD, o titular dos dados pessoais exerce, mediante requisição gratuita, os direitos de confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos, inexatos ou desatualizados, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade dos dados, informação sobre compartilhamento e revogação do consentimento quando aplicável.',
          'O canal oficial de atendimento para exercício desses direitos e comunicações com o Encarregado pelo Tratamento de Dados Pessoais (DPO) é o e-mail suporte@vitrimini.com.br.',
        ],
      },
    ],
  },
};
